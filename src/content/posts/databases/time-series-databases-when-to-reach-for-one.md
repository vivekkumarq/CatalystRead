---
title: "Time-Series Databases: When to Reach for One"
slug: "time-series-databases-when-to-reach-for-one"
description: "When a time-series database earns its place over a general-purpose one, and what you give up in exchange for the speed it buys you."
publishedAt: "2025-07-28"
updatedAt: "2026-09-16"
category: "Databases"
tags:
  - Databases
  - Time-Series
  - Data Modeling
  - Scalability
  - Analytics
---

A table with a timestamp column is not automatically a time-series problem. What actually defines time-series data is the write pattern (append-only, almost always inserting the current timestamp, essentially never updating old rows) and the read pattern (range scans over time, usually aggregated — averages, percentiles, downsampled buckets — rather than point lookups by primary key). When both of those are true at real volume, a general-purpose relational database starts fighting its own strengths, and that's the actual signal to reach for something purpose-built.

## Why a plain table degrades under this workload

A regular table with a B-tree index on `timestamp`, taking a metric reading every second from a few thousand devices, accumulates rows fast — and every one of those rows carries per-row overhead (MVCC visibility metadata in Postgres, index entries on every indexed column) that a system designed for narrow, append-only rows doesn't pay. Aggregation queries — "average CPU usage per minute for the last day" — mean scanning and computing over potentially millions of individual rows every time, unless you build and maintain that rollup yourself.

```sql
-- Works, but re-scans raw rows every single time it runs
SELECT date_trunc('minute', recorded_at) AS minute,
       avg(cpu_pct) AS avg_cpu
FROM metrics
WHERE recorded_at > now() - interval '1 day'
GROUP BY 1
ORDER BY 1;
```

## What purpose-built time-series systems actually do differently

The core techniques — used by TimescaleDB (a Postgres extension), InfluxDB, and ClickHouse alike, with different implementations — are automatic time-based partitioning (so old data can be dropped or compressed as whole chunks instead of row-by-row deletes), column-oriented storage for the metric values (which compresses extremely well because adjacent readings from the same sensor are numerically similar), and continuous aggregates that maintain rollups incrementally as data arrives instead of recomputing them from raw rows on every query.

```sql
-- TimescaleDB: a materialized, incrementally-refreshed rollup —
-- the minute-level average is precomputed, not recalculated per query
CREATE MATERIALIZED VIEW metrics_per_minute
WITH (timescaledb.continuous) AS
SELECT time_bucket('1 minute', recorded_at) AS minute,
       device_id,
       avg(cpu_pct) AS avg_cpu
FROM metrics
GROUP BY minute, device_id;
```

That single feature — continuous, incrementally-maintained aggregates — is usually the biggest practical win: dashboards querying "last 24 hours by minute" hit a small precomputed table instead of scanning and re-aggregating raw data on every page load, regardless of how much raw data has accumulated behind it.

### Retention as a first-class feature

Time-series data almost always has a natural expiration — nobody needs per-second metrics from three years ago, though they might want the daily average from that period. Purpose-built systems make dropping old raw data (while keeping downsampled rollups) a first-class, cheap operation, because it's built on the same chunk-based partitioning used for writes and reads:

```sql
-- Drop raw data older than 30 days; the continuous aggregate above
-- already holds the minute-level rollup, so nothing is actually lost
SELECT add_retention_policy('metrics', INTERVAL '30 days');
```

Doing the equivalent in a plain table means either an unindexed `DELETE` sweeping millions of rows on a schedule, or partition-based tricks you'd have to build by hand — which is exactly the plumbing a time-series system gives you out of the box.

## What you give up

Purpose-built time-series databases are usually worse at, or entirely unsuited to, arbitrary relational joins, ad hoc transactional writes, and general-purpose application data — they're specialized, and using one as your primary application database for non-time-series data tends to fight the same way a general-purpose database fights time-series workloads. TimescaleDB is the middle path most teams should evaluate first specifically because it's still Postgres — normal joins, foreign keys, and transactions still work, with time-series features layered on top — rather than a fully separate system with its own query language and operational model to learn.

## The actual threshold

The trigger isn't "we have timestamps," it's a specific pain: aggregation queries over historical ranges getting slower as data accumulates, retention jobs becoming an operational burden, or storage cost outgrowing what compression in a general-purpose database can address. Below that threshold, a well-indexed table with a scheduled rollup job is often simpler to operate than adding a new category of database to the stack.

## A worked failure mode

Metrics land in Postgres as `(ts, device, value)` with a btree on ts. Cardinality explodes; vacuums never finish; dashboards time out. A TSDB would compress, downsample, and expire. The opposite failure: a TSDB is used for customer orders because it was good at inserts; updates and joins are misery. The failure is the data's lifecycle. If you mostly append, expire, and aggregate by time, use a TSDB or a partitioned hypertable. If you mutate rows with relations, use a general database.

## When this is the wrong tool

A dedicated TSDB is the wrong tool for 10k points a day. It is the wrong place for billing ledgers. Do not store traces as unbounded tags that become series cardinality bombs. Reach for a TSDB when volume and retention would punish a row store, and you can live with its query model.

When this pattern is stretched past its assumptions, the first outage looks like a mysterious performance cliff instead of a design limit. "Time-Series Databases: When to Reach for One" fails that way when traffic mix, data shape, or team skill does not match the blog that sold the approach. Keep a kill switch: feature flag, smaller blast radius, or an older path that still works. Measure the thing the idea claims to improve, not a vanity graph. If you cannot name a workload where you would refuse to use it, you have not finished the design.
