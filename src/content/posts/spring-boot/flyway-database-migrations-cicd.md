---
title: "Database Migrations with Flyway in a CI/CD Pipeline"
slug: "flyway-database-migrations-cicd"
description: "Practical rules for writing Flyway migrations that survive a real CI/CD pipeline, including rollback strategy and how to handle schema drift across environments."
publishedAt: "2025-08-22"
category: "Spring Boot"
tags:
  - Spring Boot
  - Flyway
  - DevOps
  - Databases
---

Flyway's core idea is simple: every schema change is a versioned, immutable SQL file, applied in order, tracked in a table so the tool always knows exactly what state a database is in. The idea is simple; the discipline required to make it work reliably across a team and a CI/CD pipeline is where most of the actual engineering happens.

## The One Rule That Matters Most

A Flyway migration, once applied to any shared environment, is immutable. Editing `V12__add_customer_index.sql` after it has run anywhere other than your own laptop is the single most common way to break a team's migrations — Flyway checksums each applied migration, and a checksum mismatch on deploy will hard-fail the application startup, usually at the worst possible time.

```sql
-- V12__add_customer_index.sql
CREATE INDEX CONCURRENTLY idx_customer_email ON customers (email);
```

```sql
-- V13__add_customer_status_column.sql
ALTER TABLE customers ADD COLUMN status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE';
```

If a migration needs to change after review feedback but before it's merged to a shared branch, edit the file freely. Once it's merged, the only safe move is a new migration that corrects the previous one.

## Wiring It Into CI/CD Without Surprises

The pipeline should validate migrations against a real database before they ever reach a shared environment, not rely on `ddl-auto` or hope. A common pattern: spin up a disposable Postgres container in CI, run `flyway migrate` against it, then run the application's integration test suite against that same freshly migrated schema.

```yaml
# application.yml
spring:
  flyway:
    enabled: true
    baseline-on-migrate: true
    locations: classpath:db/migration
  jpa:
    hibernate:
      ddl-auto: validate
```

Setting `ddl-auto: validate` (never `update` or `create` outside local development) means Hibernate checks your entity mappings against the actual schema at startup and fails loudly if they've drifted apart, instead of quietly generating DDL that nobody reviewed. Flyway owns schema changes; Hibernate only ever verifies against them.

`baseline-on-migrate: true` matters for any environment — typically a long-lived staging or production database — that has existing tables Flyway didn't create. It lets Flyway establish a starting version rather than failing because the schema already has objects it doesn't recognize.

## Backward-Compatible Migrations for Zero-Downtime Deploys

If deployments roll out new application instances gradually while old ones are still serving traffic, a migration that both changes the schema and requires the new code in the same step will break the old instances mid-rollout. The standard technique is splitting a breaking change into multiple backward-compatible migrations across multiple deploys:

1. **Add** the new column as nullable, deploy code that writes to both old and new columns.
2. **Backfill** existing rows in a separate migration, ideally batched for large tables.
3. **Deploy** application code that reads only from the new column.
4. **Drop** the old column in a later migration, once you're confident nothing still depends on it.

```sql
-- V20__add_shipping_address_json.sql
ALTER TABLE orders ADD COLUMN shipping_address_json JSONB;
```

```sql
-- V21__backfill_shipping_address_json.sql
UPDATE orders
SET shipping_address_json = jsonb_build_object('line1', shipping_line1, 'city', shipping_city)
WHERE shipping_address_json IS NULL;
```

It's slower than a single migration, and it's the difference between a deploy nobody notices and an incident where half your fleet is throwing errors because they're running old code against a schema that already moved on.

## Flyway Doesn't Do Rollback — Plan Accordingly

Flyway has no built-in "undo" for a migration once applied (the paid Teams edition has undo migrations, but the open-source core doesn't). The practical rollback strategy is almost always forward-only: if `V14` causes a problem, you ship `V15` that corrects it, rather than trying to reverse `V14` in place. Writing migrations as small, single-purpose, and reviewed as carefully as application code is what makes forward-only rollback tolerable instead of terrifying.
