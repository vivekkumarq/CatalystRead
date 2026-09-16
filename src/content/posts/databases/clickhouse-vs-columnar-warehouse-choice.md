---
title: "ClickHouse vs a Cloud Columnar Warehouse: Pick the Failure Mode"
slug: "clickhouse-vs-columnar-warehouse-choice"
description: "MergeTree local execution versus elastic warehouses: when you want ClickHouse's latency, and when you want Snowflake/BigQuery's isolation."
publishedAt: "2026-08-12"
category: "Databases"
tags:
  - Databases
  - ClickHouse
  - Analytics
  - Columnar
sources:
  - title: "ClickHouse Architecture"
    publisher: "ClickHouse documentation"
    url: "https://clickhouse.com/docs/en/development/architecture"
  - title: "Dremel: Interactive Analysis of Web-Scale Datasets"
    author: "Sergey Melnik et al."
    publisher: "VLDB 2010"
    url: "https://research.google/pubs/pub36632/"
---

Both ClickHouse and a cloud warehouse (Snowflake, BigQuery, Redshift RA3) scan columns, not rows, and both can devour event logs. They fail differently. ClickHouse is a **shared-nothing MergeTree** engine you operate (or buy as a service that still feels like a cluster): inserts create parts, background merges compact them, queries hit local disks or object storage with a cache. Warehouses separate **storage in object stores** from **elastic compute**, with stronger isolation between tenants and weaker guarantees that p95 will be 50ms.

## ClickHouse's bet: keep the hot path close to the CPU

MergeTree orders data by a primary key (really a sparse index). Filters on that key skip granules. `ORDER BY (tenant, ts)` makes tenant-scoped dashboards fast and makes "all tenants last 90 days" a large scan. Inserts should be **batched**; tiny inserts create too many parts and merge debt — the operational analog of LSM compaction. `ReplacingMergeTree` and friends defer dedup to merge time; if you need exact-once visibility at query time, you pay with `FINAL` or a different model.

```sql
CREATE TABLE hits (...) ENGINE = MergeTree
ORDER BY (site_id, event_time);
```

Replication (ReplicatedMergeTree, Keeper) is a cluster you can get wrong: split brain, too many parts, mutation backlog. The reward is sub-second analytics on a box you can actually see in `system.parts`.

## Warehouse bet: pay for isolation and SQL ecosystem

BigQuery (Dremel lineage) and Snowflake shine when many teams share data without sharing failure domains, when you want time travel/clones as policy, and when you do not want to think about parts. Cold start and slot/credit contention replace merge debt. Latency SLOs in the tens of milliseconds for user-facing product analytics are harder; these systems were built for analysts and pipelines.

ClickHouse SQL is fast-evolving but not Postgres. Window functions, joins, and dictionaries have sharp edges. Warehouses usually win on BI tool compatibility and governance catalogs. ClickHouse often wins on **online** analytics in the application path (feature stores, product dashboards, logs) if you can stomach ops.

## A choice procedure

If a product page blocks on the query, prototype ClickHouse (or a managed ClickHouse) and measure merge/insert patterns. If the consumers are notebooks and dbt, and data already lives in S3/GCS, a warehouse avoids a second operational personality. If you need both, it is common to land in object storage, warehouse for heavy SQL, and ClickHouse for the serving slice — with the usual dual-write or CDC cost.

Do not pick ClickHouse to save money on a 2 TB dataset a warehouse would price in rounding error, then spend a staff engineer on parts. Do not pick BigQuery for a 10ms tenant dashboard.

Read ClickHouse's architecture notes on parts and the Dremel paper for disaggregated serving. Then look at your SLO: interactive product versus elastic analyst. Columnar is the family. The failure mode is the product.
