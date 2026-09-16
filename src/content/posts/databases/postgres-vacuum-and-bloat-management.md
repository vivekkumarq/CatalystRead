---
title: "Postgres VACUUM and the Bloat It's Fighting"
slug: "postgres-vacuum-and-bloat-management"
description: "What Postgres's VACUUM process is actually cleaning up, why tables bloat despite it, and how to keep autovacuum from falling behind."
publishedAt: "2025-06-06"
updatedAt: "2026-09-16"
category: "Databases"
tags:
  - Databases
  - PostgreSQL
  - Performance
  - Maintenance
  - MVCC
---

`VACUUM` shows up in Postgres troubleshooting threads constantly, usually attached to a table that's mysteriously larger than its row count would suggest, or a query that's slower than an equivalent one on a table with more actual data. The reason both symptoms trace back to the same process is that VACUUM exists to clean up a direct consequence of MVCC: dead row versions that `UPDATE` and `DELETE` leave behind instead of removing immediately.

## Why dead rows pile up in the first place

An `UPDATE` in Postgres doesn't modify a row in place — it writes a new row version and marks the old one as expired via its `xmax`. A `DELETE` just marks the row expired without writing a replacement. Neither operation reclaims the space right away, because some other transaction's snapshot might still legitimately need to see that old version. `VACUUM`'s job is to go back through the table once it's safe — once no active transaction's snapshot could possibly need the old version anymore — and mark that space reusable.

```sql
-- See how much of a table is actually dead tuples right now
SELECT relname, n_live_tup, n_dead_tup,
       round(n_dead_tup::numeric / GREATEST(n_live_tup, 1) * 100, 1) AS dead_pct
FROM pg_stat_user_tables
ORDER BY n_dead_tup DESC
LIMIT 10;
```

## VACUUM reclaims space, it doesn't shrink the file

This is the detail that surprises people: a regular `VACUUM` marks dead space as reusable *for future inserts and updates on the same table*, but it does not shrink the file on disk or return space to the OS. That's why a table that had a huge one-time deletion can stay physically large indefinitely — the space is available for Postgres to reuse, but the file size on disk doesn't drop. Only `VACUUM FULL` actually rewrites the table into a new, compact file, and it does so by taking an `ACCESS EXCLUSIVE` lock for the entire operation, which blocks all reads and writes — not something to run on a live production table without real downtime, or without `pg_repack`, which achieves the same result using a shadow-table swap that avoids the long exclusive lock.

## Why autovacuum falls behind

Autovacuum is triggered per table based on the fraction of rows that have changed since the last vacuum, controlled by `autovacuum_vacuum_scale_factor` (default 0.2, meaning 20% of the table). On a huge table, 20% is a lot of rows before autovacuum even triggers, and once triggered, it has to compete for I/O with the application's actual traffic, throttled by `autovacuum_vacuum_cost_limit` so it doesn't starve foreground queries. The combination — a high percentage threshold plus throttled I/O — is exactly why large, high-write tables are the ones that fall behind, while small tables stay clean almost automatically.

```sql
-- Tune autovacuum more aggressively for one specific hot table,
-- rather than changing the global default for every table
ALTER TABLE orders SET (
    autovacuum_vacuum_scale_factor = 0.02,
    autovacuum_vacuum_cost_limit = 2000
);
```

### The wraparound failure mode

Beyond bloat, VACUUM has a second job that's easy to forget: freezing old transaction IDs so Postgres's internal 32-bit transaction counter doesn't wrap around and make old data ambiguously "in the future." If autovacuum can't keep up — often because a long-running open transaction is holding back the point up to which it's safe to vacuum — Postgres will eventually force itself into single-user, vacuum-only mode to protect data integrity, which is a full outage. `SELECT datname, age(datfrozenxid) FROM pg_database;` run periodically is a cheap early-warning check most teams don't have until after the first incident.

## Keeping ahead of it

Monitor `n_dead_tup` and table bloat percentage as a standing metric, not just when something's already slow. Tune `autovacuum_vacuum_scale_factor` down per table for your largest, highest-churn tables rather than globally. And treat any transaction left open for more than a few minutes — a forgotten `BEGIN` in a psql session, an application connection pool that isn't closing transactions promptly — as an incident, because it silently blocks vacuum progress across the entire database, not just the tables it touches.

## A worked failure mode

Autovacuum is tuned quieter because it "used CPU." Dead tuples from a high-churn queue table never get vacuumed; the table is 40GB of 2GB live data; index-only scans die. A wraparound emergency then freezes the cluster at peak traffic. The failure is treating vacuum as optional. Watch age of databases, bloat estimates, and autovacuum workers. Use aggressive settings on churn tables, and `FILLFACTOR` / HOT updates where they apply.

## When this is the wrong tool

Manual `VACUUM FULL` in business hours is the wrong tool for routine bloat; it locks. Tuning vacuum will not fix a design that updates a row 10k times a second if you should be appending. Do not disable autovacuum. If the workload is append-only time series, consider partitioning and drop. Vacuum is for MVCC hygiene, not a substitute for schema design.

The wrong-tool test is easier with a concrete customer. If a user can lose money, lose access, or see someone else's data when "Postgres VACUUM and the Bloat It's Fighting" is slightly misapplied, do not let the pattern ride on defaults. Tighten the API, add an assertion in CI, and refuse silent fallbacks that look like success. Most production failures here are not exotic; they are a missing bound, a missing key, or a missing check that the original paper assumed a careful operator would have.
