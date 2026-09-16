---
title: "ClickHouse MergeTree: Why Analytics Inserts Are a Background Merge, Not a B-Tree Update"
slug: "clickhouse-mergetree-analytic-engine"
description: "How ClickHouse's MergeTree family stores data in immutable parts and merges them in the background, which is why inserts are fast and mutations are not."
publishedAt: "2026-12-18"
updatedAt: "2026-12-18"
category: "ClickHouse"
tags:
  - Engineering at Scale
  - ClickHouse
  - Databases
  - Analytics
sources:
  - title: "MergeTree Engine Family"
    publisher: "ClickHouse"
    url: "https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/mergetree"
  - title: "Parts and merges"
    publisher: "ClickHouse"
    url: "https://clickhouse.com/docs/en/optimize/sparse-primary-indexes"
---

ClickHouse is fast at scanning because it is columnar, compressed, and sparse-indexed. It is fast at ingest because it does not maintain a B-tree of rows for every insert. MergeTree writes a sorted, immutable "part" (a directory of columns) and later merges parts into larger ones in the background, like an LSM tree with analytics-shaped extras: primary key is an ordered prefix for skipping granules, not a unique constraint unless you say so. Once you internalize parts, a lot of ClickHouse operations stop looking like bugs.

## Inserts want batches

A tiny insert creates a tiny part. Too many parts and the server hits `too many parts`, merges fall behind, and queries suffer. The fix is batching (thousands of rows per insert), async inserts, or a buffer table. The primary key / order by determines physical sort. Choose it for the filters you actually run (`(event_date, user_id)` vs a UUID that never helps skip).

Granules (default 8192 rows) are the skip unit. Sparse index is not a B-tree lookup of one row. Point gets of a single UUID in a huge table are the wrong sport; use a key-value store.

## Mutations, deletes, and ReplacingMergeTree

`ALTER DELETE` is a mutation that rewrites parts. It is not an OLTP delete. GDPR deletes are a planning item. `ReplacingMergeTree` and `CollapsingMergeTree` encode updates as extra rows that collapse at merge time — queries may see duplicates until merge (or you use `FINAL`, which is expensive). This is the contract. If you need immediate unique rows, you picked a difficult path in ClickHouse.

Materialized views on MergeTree are insert triggers into other MergeTrees. They are fantastic and they multiply part pressure.

## Failure modes of MergeTree

The concrete failure is an insert-per-event from a microservice, 20k parts later, cluster stuck. Mid-size steal: a Kafka engine or a batcher, and alerts on `parts_to_delay_insert`.

Operational gotcha: `OPTIMIZE TABLE FINAL` on a huge table during business hours because a dashboard wanted `FINAL` semantics. Another is a partition key that is too fine (partition per hour per customer) so you have millions of partitions. Partition by month or day, not by high-cardinality id. TTL can drop old partitions cheaply if you partitioned by time; TTL on a non-partition expression may rewrite. Compression codecs per column (`ZSTD`, `Delta`) are free performance if you set them on the right types. If you skip `ORDER BY` design, every query is a full scan with extra steps. Steal the LSM lesson: background merge is the write path. Budget merge CPU. Watch selected granules vs total granules in query logs; if they are equal, your order-by is wrong. Do not run ClickHouse like Postgres with ORM updates. Append facts. A useful extra is a dedicated buffer or Kafka consumer group per table so retries do not create duplicate parts with different checksums that never collapse. Idempotency keys in the batch (or a ReplacingMergeTree version column) keep replays honest. Operators should know how long the longest merge is allowed to run before it is declared stuck; a merge that sits for hours is a silent capacity leak.

## What you can borrow

- Batch inserts so the engine merges parts, not a folder of one-row files.
- Design `ORDER BY` for skip, not for uniqueness theater.
- Treat mutations as batch jobs; encode updates as additional rows if you can.
- Partition by time for cheap drops; alert on part count.
