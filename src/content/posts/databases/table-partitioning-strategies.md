---
title: "Table Partitioning Strategies That Actually Pay Off"
slug: "table-partitioning-strategies"
description: "A comparison of range, list, and hash partitioning strategies, when each one earns its operational complexity, and when it's premature."
publishedAt: "2024-12-02"
category: "Databases"
tags:
  - Databases
  - SQL
  - PostgreSQL
  - Scalability
  - Data Modeling
---

Partitioning gets pitched as a performance feature, but the honest first question is whether you need it at all. A well-indexed table with a few hundred million rows on decent hardware is often still perfectly fast. Partitioning earns its complexity when you have a specific operational problem it solves — usually bulk deletes, index bloat on a huge table, or query patterns that only ever touch a narrow slice of the data — not as a default for "the table got big."

## Range partitioning: the common case

Range partitioning splits a table by a value range, almost always a timestamp, and it solves a problem that indexes alone can't: cheap deletion of old data. Deleting a year-old partition is a metadata operation — `DROP TABLE` on the partition, effectively instant — versus a `DELETE` statement that has to find and remove millions of rows, generate that many WAL records, and leave behind dead tuples for autovacuum to clean up.

```sql
CREATE TABLE events (
    id bigint,
    event_type text,
    created_at timestamptz NOT NULL,
    payload jsonb
) PARTITION BY RANGE (created_at);

CREATE TABLE events_2025_01 PARTITION OF events
    FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');

CREATE TABLE events_2025_02 PARTITION OF events
    FOR VALUES FROM ('2025-02-01') TO ('2025-03-01');

-- Instant, not a scan-and-delete
DROP TABLE events_2025_01;
```

The other benefit is partition pruning: a query with a `created_at` predicate that the planner can statically match to specific partitions will skip scanning the rest entirely, which keeps query performance flat as the table grows, as long as queries actually filter on the partition key.

## List and hash partitioning: narrower use cases

List partitioning splits by discrete values — a `region` or `tenant_id` column, for example — which is useful when different partitions genuinely have different access patterns or lifecycle rules, like archiving one region's data on a different schedule. Hash partitioning distributes rows pseudo-randomly across a fixed number of partitions based on a hash of the key, which is useful purely for spreading write load and index size evenly when there's no natural range or list boundary, but it gives up the pruning benefit for range queries entirely since hash values don't preserve order.

```sql
CREATE TABLE user_sessions (
    user_id bigint,
    session_id uuid,
    started_at timestamptz
) PARTITION BY HASH (user_id);

CREATE TABLE user_sessions_p0 PARTITION OF user_sessions
    FOR VALUES WITH (MODULUS 4, REMAINDER 0);
-- ... p1, p2, p3
```

## What partitioning doesn't fix

Partitioning is not a substitute for indexing — each partition needs its own indexes (or you define them on the parent and Postgres propagates them), and a query that doesn't filter on the partition key still has to scan every partition, which can be slower than scanning one large table if the planner has to open dozens of partitions to satisfy a single query. It also doesn't reduce total storage or total row count; it reorganizes the same data into smaller physical units. Foreign keys referencing a partitioned table, and unique constraints that don't include the partition key, come with real restrictions in Postgres that are easy to discover only after the migration is already in production.

## A reasonable threshold

In practice, the trigger for partitioning is rarely a row count in isolation — it's a specific pain point: `VACUUM` taking hours on one enormous table, bulk deletes timing out or bloating the table, or a clear, stable access pattern where 95% of queries only touch the last 30 days. If none of those are true yet, adding partitioning early mostly adds migration risk and query-planning edge cases without a payoff to show for it.
