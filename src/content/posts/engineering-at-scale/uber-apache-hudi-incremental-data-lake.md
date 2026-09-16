---
title: "Apache Hudi: Making the Data Lake Behave Like a Database"
slug: "uber-apache-hudi-incremental-data-lake"
description: "How Uber built Hudi to bring record-level updates, deletes, and incremental processing to a Hadoop data lake designed for immutable batch files."
publishedAt: "2025-08-19"
updatedAt: "2026-09-16"
category: "Uber"
tags:
  - Engineering at Scale
  - Uber
  - Data Engineering
  - Big Data
sources:
  - title: "Hudi: Uber Engineering's Incremental Processing Framework on Hadoop"
    publisher: "Uber Engineering Blog"
    url: "https://www.uber.com/blog/engineering/"
  - title: "Apache Hudi"
    publisher: "Apache Software Foundation"
    url: "https://hudi.apache.org"
---

Uber's data lake, like most built on Hadoop-era technology, was designed around large, immutable batch files — great for append-only ingestion and full-dataset batch jobs, terrible for the thing Uber actually needed to do constantly: update or delete individual records as trips changed state, riders requested data deletion, or upstream source-of-truth databases mutated rows that had already landed in the lake. The standard answer at the time was to rewrite entire partitions to reflect small changes, which meant every update, however small, triggered enormous, slow, expensive batch rewrites. Uber built Hudi (Hadoop Upserts Deletes and Incrementals) to bring record-level mutation and incremental processing to a storage layer that fundamentally wasn't designed for either.

## Upserts without rewriting the world

Hudi's central contribution is letting a data lake table support upserts — insert-or-update semantics on individual records, identified by a record key — without requiring a full rewrite of the files containing unrelated records. It does this by tracking record-level metadata and supporting two underlying table storage strategies: one (copy-on-write) that rewrites only the affected file group at write time for read-optimized query performance, and another (merge-on-read) that appends changes to a log and merges them with base files at read time, trading some read overhead for much cheaper, lower-latency writes. That choice lets teams pick the tradeoff that matches their workload — copy-on-write for read-heavy analytical tables, merge-on-read for tables that mutate frequently.

## Incremental pulls instead of full scans

Beyond upserts, Hudi exposes an incremental query mode: instead of a downstream job re-scanning an entire table to find what changed since its last run, it can pull just the records that changed since a given point in time, the way a database change-data-capture stream would. That turned a class of downstream pipelines that previously had to do full-table diffs or full recomputation into pipelines that process only the delta, which mattered enormously once Uber's data volumes made full-table batch jobs prohibitively slow to run at the cadence the business wanted.

## From Uber project to Apache project

Hudi originated inside Uber to solve this specific ingestion and freshness problem on its data lake, and Uber open sourced it, after which it was donated to the Apache Software Foundation and became a top-level Apache project. It's since seen adoption well beyond Uber, often discussed alongside other "table format" projects that bring database-like semantics (ACID transactions, schema evolution, time travel) to data lake storage, a category that also includes Delta Lake and Apache Iceberg, each with different origins and design tradeoffs.

## Why this mattered beyond storage mechanics

The practical payoff for Uber was data freshness: pipelines and analytics that depended on the data lake no longer had to tolerate the staleness that came from expensive, infrequent full-partition rewrites. Trip data, driver data, and other frequently mutated business records could be reflected in lake-backed analytics with much lower lag, which mattered for both internal reporting and downstream systems, like machine learning feature pipelines, that depended on reasonably fresh lake data rather than yesterday's batch snapshot.

## What a mid-size team can steal from Hudi

Hudi (and cousins Iceberg/Delta) let Uber ingest incremental upserts into a lake instead of rewriting partitions daily. Mid-size steal: upsert-friendly tables for CDC from trips and payments, with compaction as a scheduled job, so streaming and batch readers see a consistent snapshot.

The concrete failure mode is a stream of tiny files from Flink/Spark that nobody compacts; query engines scan millions of files and miss SLAs. Compaction is on-call, not optional. Operational gotcha: copy-on-write vs merge-on-read chosen once in a blog and wrong for your read/write ratio. Measure. Late money events that upsert a trip after a finance snapshot will change history; you need a business rule, not only a table type. GDPR deletes are another upsert class with legal deadlines. Dual engines reading half-committed instants is how two dashboards disagree. Pin a table snapshot in jobs that must match. You do not need Uber's whole lake. One Hudi or Iceberg table for the core business events, with a documented commit rate, beats twenty raw JSON dumps. The steal is incremental, transactional lake tables. The anti-steal is five competing table formats in one bucket because each squad followed a different talk.

## What you can borrow

- If your data lake workload is dominated by rewriting entire partitions for small mutations, that's a strong signal you need record-level upsert support, not a bigger cluster.
- Offer both write-optimized and read-optimized storage strategies where possible — real workloads split between mutation-heavy and query-heavy, and one storage strategy rarely serves both well.
- Incremental, change-data-capture-style consumption is usually cheaper and faster than re-diffing full datasets on every pipeline run.
- A table-format layer that adds database semantics to lake storage is often more valuable than migrating to a different storage system entirely.
