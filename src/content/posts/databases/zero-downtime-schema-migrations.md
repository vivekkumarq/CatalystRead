---
title: "Zero-Downtime Schema Migrations in Production"
slug: "zero-downtime-schema-migrations"
description: "Techniques for adding columns, changing types, and backfilling data on a live table without locking it or breaking the app mid-deploy."
publishedAt: "2025-02-25"
category: "Databases"
tags:
  - Databases
  - SQL
  - Migrations
  - PostgreSQL
  - DevOps
---

The migration that takes down production is rarely the one that looks dangerous. It's the routine `ALTER TABLE` that someone has run a hundred times on staging, on a table that happens to be a hundred times bigger in production, taking a lock that blocks every read and write until it finishes. Zero-downtime migration technique is mostly about knowing which operations take which locks, and structuring changes to avoid the expensive ones.

## Not all ALTER TABLE statements are equal

Adding a column with no default, or a default that Postgres can compute without rewriting the table, is fast and only takes a brief `ACCESS EXCLUSIVE` lock to update the catalog — modern Postgres (11+) doesn't rewrite the table for a constant default anymore. But adding a `NOT NULL` constraint, changing a column's type, or adding a default that requires per-row computation can force a full table rewrite, holding that same exclusive lock for the entire duration — which, on a large table, is minutes of total unavailability.

```sql
-- Fast in modern Postgres: catalog-only change, no table rewrite
ALTER TABLE orders ADD COLUMN priority int DEFAULT 0;

-- Slow: requires validating every existing row under an exclusive lock
ALTER TABLE orders ALTER COLUMN customer_id SET NOT NULL;
```

## The safe pattern for NOT NULL: constraint, then validate

Postgres separates *adding* a constraint from *validating* it against existing data, and that split is the key to doing this without blocking. `NOT VALID` adds the constraint immediately with only a brief lock, enforcing it for all new writes from that point forward, while `VALIDATE CONSTRAINT` checks existing rows separately using a lock that permits concurrent reads and writes.

```sql
ALTER TABLE orders
    ADD CONSTRAINT orders_customer_id_not_null
    CHECK (customer_id IS NOT NULL) NOT VALID;

-- Runs without blocking concurrent reads/writes, just slower
ALTER TABLE orders VALIDATE CONSTRAINT orders_customer_id_not_null;
```

The same `NOT VALID` / `VALIDATE` split works for foreign keys, which is the other common source of surprise multi-minute locks on large tables.

## Changing a column's type without a rewrite

A type change like `int` to `bigint` is deceptively expensive because Postgres has to rewrite every row. The workaround is to add a new column of the target type, backfill it in small batches (so each batch's lock is brief and other transactions can interleave), keep both columns in sync with a trigger during the transition, then swap the column names in a fast metadata-only step once the backfill is done.

```sql
ALTER TABLE orders ADD COLUMN id_new bigint;

-- Backfill in batches, not one giant UPDATE
UPDATE orders SET id_new = id
WHERE id BETWEEN 1 AND 10000 AND id_new IS NULL;
-- repeat in batches...

-- Once fully backfilled and verified, swap names in a fast transaction
BEGIN;
ALTER TABLE orders RENAME COLUMN id TO id_old;
ALTER TABLE orders RENAME COLUMN id_new TO id;
COMMIT;
```

### Indexes: always CONCURRENTLY

A plain `CREATE INDEX` takes a lock that blocks writes to the table for as long as the index build runs, which on a large table can be a very long window of write unavailability. `CREATE INDEX CONCURRENTLY` builds the index without blocking writes, at the cost of taking roughly twice as long and requiring a separate cleanup step if it fails partway through (it can leave behind an invalid index that needs to be dropped and retried).

```sql
CREATE INDEX CONCURRENTLY idx_orders_priority ON orders (priority);
```

## The deploy-ordering half of the problem

The other half of zero-downtime migrations isn't SQL at all — it's making sure the application code deployed *before* the migration and the code deployed *after* it can both run correctly against whichever schema version happens to be live during the rollout. That means additive changes first (new nullable column, deployed and backfilled) with application code updated to write to both old and new in a middle deploy, and only removing the old column in a final deploy once nothing references it. Skipping that staging and doing the rename or drop in the same deploy as the code change is what turns an otherwise lock-safe migration into a rolling-deploy outage anyway.
