---
title: "Micro-Partitions: Snowflake's Unit of Pruning and Clustering"
slug: "snowflake-micro-partitions-and-pruning"
description: "Snowflake stores tables as compressed micro-partitions with per-column min/max metadata so most queries never open most files."
publishedAt: "2026-10-11"
updatedAt: "2026-10-11"
category: "Snowflake"
tags:
  - Engineering at Scale
  - Snowflake
  - Data Warehouses
  - Query Engines
sources:
  - title: "Micro-partitions and data clustering"
    publisher: "Snowflake Documentation"
    url: "https://docs.snowflake.com/en/user-guide/tables-clustering-micropartitions"
  - title: "The Snowflake Elastic Data Warehouse"
    author: "Dageville et al."
    publisher: "SIGMOD 2016"
    url: "https://dl.acm.org/doi/10.1145/2882903.2903741"
---

Once table bytes live in object storage, query speed is mostly "how many files did you open?" Snowflake writes tables as *micro-partitions*: contiguous compressed chunks, typically tens to hundreds of megabytes uncompressed, each carrying column-level stats (min, max, distinct-ish sketches, null counts). The optimizer uses those stats to prune partitions that cannot contain rows matching the predicates. A query with `WHERE event_date = '2026-10-11'` on a table clustered by date should touch a sliver of the table. A query that filters on an uncorrelated column may still scan everything. Clustering is how you make the common predicates align with how data is laid out on disk.

## Automatic clustering versus hope

Load order often happens to be roughly time-ordered, so time filters work on day one. Then a MERGE, a backfill, or a wide dimension update scatters keys across partitions and pruning collapses. Snowflake's automatic clustering service rewrites micro-partitions in the background to restore locality on declared cluster keys, billed as extra compute. That is a deliberate product: clustering is not a one-time `ALTER` you forget. It is a maintenance process with a lag.

Choosing cluster keys is capacity planning. High-cardinality unique IDs make terrible sole cluster keys (every partition's min/max covers almost the whole domain). Low-cardinality keys (country) prune coarsely. Compound keys (date, then a selective id) are the usual compromise. Engineers who copy a primary key from OLTP into a warehouse cluster key recreate OLTP's access path, which is not the warehouse's.

## Metadata, overlap, and the scan you did not expect

Pruning quality depends on *overlap*. If many partitions have overlapping min/max for the filter column, the optimizer cannot skip them. That happens after random inserts. Depth maps and clustering ratios in Snowflake's documentation exist so you can see overlap before you blame the warehouse size. Partitioning in the Hive sense (explicit directory partitions) is a coarser tool Snowflake still supports via table structure, but micro-partitions are the fine-grained default.

Writes create new micro-partitions rather than updating in place, which plays nicely with immutable object storage and time travel. The cost is table churn: frequent small writes produce many small partitions, which hurts both pruning metadata overhead and scan efficiency. COPY and larger batched loads produce healthier layouts than row-by-row inserts. Search optimization service (a secondary structure for point lookups) is Snowflake admitting that not every query is a range scan on the cluster key.

The borrow, even if you are on another engine, is the same as good Parquet hygiene: file sizes in a sweet spot, min/max in the footer, layout matching predicates, and a paid or scheduled rewrite when DML wrecks locality. Snowflake productized that loop.

Query profiles that show "partitions scanned vs. partitions total" should be on the same dashboard as warehouse credits. A doubling of scanned partitions after a MERGE is a clustering incident, not a "we need 2XL" incident. Teams that only watch queue time will scale compute over a layout that a rewrite would have fixed for less money and more stable latency.

## What you can borrow

- Store per-file column min/max (and similar sketches) and prune before IO.
- Align physical layout with the predicates you actually run, then measure overlap after DML.
- Batch writes so files stay in a healthy size band; tiny files destroy pruning and planning time.
- Budget background reclustering; load order is not a forever clustering guarantee.
- Do not cluster on high-cardinality unique IDs unless point lookup is the workload and you have a structure for it.
