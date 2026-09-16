---
title: "TimescaleDB Hypertables: Partitioning Time Without Leaving Postgres"
slug: "timescaledb-hypertables"
description: "Chunks, chunk exclusion, compression, and retention policies: when a hypertable beats rolling your own monthly partitions."
publishedAt: "2026-08-17"
category: "Databases"
tags:
  - Databases
  - PostgreSQL
  - TimescaleDB
  - Time Series
sources:
  - title: "Hypertables and chunks"
    publisher: "Timescale documentation"
    url: "https://docs.timescale.com/use-timescale/latest/hypertables/"
  - title: "Compression"
    publisher: "Timescale documentation"
    url: "https://docs.timescale.com/use-timescale/latest/compression/"
---

TimescaleDB is Postgres with extra catalog machinery. A **hypertable** is a parent that routes inserts into **chunks** — child tables partitioned by time (and optionally a space dimension like `device_id`). Queries on the hypertable get **chunk exclusion**: if you `WHERE ts >= now() - interval '1 day'`, old chunks are not in the plan. That is the same idea as native declarative partitioning, with conventions, policies, and compression aimed at telemetry.

## Chunk size is the tuning knob you will get wrong

Too-small chunks mean thousands of tables, planning time that hurts, and autovacuum storms. Too-large chunks mean exclusion cannot skip enough and vacuum/index maintenance hits giant children. Timescale's docs suggest chunk intervals so that recent chunks fit in memory patterns you actually have — often hours to a week depending on ingest rate.

```sql
SELECT create_hypertable('metrics', by_range('ts'));
SELECT add_retention_policy('metrics', INTERVAL '90 days');
```

Space partitioning helps when a single time chunk would be huge and you can isolate by tenant or device hash. It multiplies chunk count; use it when you have evidence, not as a default.

## Compression is a columnstore overlay

Timescale compression rewrites older chunks into a more columnar form (segment by, order by). Queries that hit compressed chunks can be fast for aggregates and painful for point updates. The intended pattern is **hot uncompressed recent data, cold compressed history**. Unique constraints and some update patterns interact badly with compression — read the compatibility list before you compress a chunk that is still being corrected.

Retention policies `DROP` old chunks. That is cheaper than `DELETE FROM metrics WHERE ts < …`, which would heap-bloat a single table. If you rolled your own partitions, you already knew this; Timescale's policy scheduler is the difference between "we intended to drop January" and "January is still in the backup."

## What is still Postgres

Indexes, `EXPLAIN`, WAL, replication slots, and ORMs that dislike inheritance/partition parents. Some ORMs need to talk to the hypertable name and not invent per-chunk inserts. JOINs to dimension tables work; JOINs of two huge hypertables on non-time keys can still explode.

If your "time series" is 2000 rows a day, a normal table is enough. If it is 50k rows/s of device metrics with a 90-day keep, hypertables plus compression plus retention are the point. If you need PromQL and scrape cardinality, you may want Prometheus/Mimir instead of SQL — different query language, different cardinality failure modes.

Read Timescale's hypertable and compression docs, then `EXPLAIN` a dashboard query with and without a time predicate. If chunk exclusion is not happening, your predicate is wrapped in a function the planner cannot prove, and you are scanning history you already paid to partition away.
