---
title: "Presto: Interactive SQL Over a Petabyte-Scale Warehouse"
slug: "meta-presto-interactive-sql-petabyte-warehouse"
description: "How Facebook built Presto to give analysts interactive, seconds-scale SQL queries over a Hive warehouse that Hive's own engine took minutes to hours to query."
publishedAt: "2025-11-18"
updatedAt: "2026-09-16"
category: "Meta"
tags:
  - Engineering at Scale
  - Meta
  - Data Infrastructure
  - Databases
sources:
  - title: "Presto: Interacting with petabytes of data at Facebook"
    author: "Martin Traverso et al."
    publisher: "Facebook Engineering"
    url: "https://engineering.fb.com"
---

By the early 2010s, Facebook's data warehouse, built on Hive and stored in a Hadoop-based filesystem, held petabytes of data and was the standard way engineers and analysts ran SQL-like queries over it. Hive worked, but it compiled every query down into a series of MapReduce jobs, and MapReduce's execution model — writing intermediate results to disk between stages, scheduling separate jobs for each stage of a query plan — was built for large batch jobs that could tolerate running for tens of minutes to hours. That was fine for overnight reporting pipelines. It was miserable for an analyst trying to interactively explore data, where a multi-minute wait for each query breaks the exploratory workflow entirely.

## The batch engine underneath was the wrong tool for interactive queries

The core mismatch was that Hive's execution engine treated every query as a batch job, incurring MapReduce's per-job overhead (job scheduling, writing intermediate data to disk between stages) regardless of whether the query itself was actually large or complex. A query that only needed to scan a modest slice of data and aggregate it still paid the same structural tax as a genuinely huge job, because the execution model didn't distinguish between the two. Facebook needed a query engine that could still read the same underlying Hive-managed data, but execute in a way suited to interactive, ad hoc queries rather than only long-running batch pipelines.

## An engine built for in-memory, pipelined execution

Facebook's answer was Presto, a distributed SQL query engine built from scratch specifically for low-latency, interactive queries over large datasets. Instead of materializing intermediate results to disk between MapReduce-style stages, Presto pipelines data through operators in memory across a cluster of workers, moving data directly from one processing stage to the next without the disk round trip that was costing Hive so much wall-clock time. Presto was also built to be a general query engine rather than tied to one storage system: it queries data through pluggable connectors, so the same engine could run SQL not just over the Hive warehouse but over other data sources without requiring a separate query tool for each.

```sql
SELECT country, COUNT(*) AS users
FROM events
WHERE event_date >= DATE '2026-01-01'
GROUP BY country
ORDER BY users DESC
LIMIT 10;
```

## From an internal tool to an open-source standard

Facebook open sourced Presto in 2013, and it went on to be adopted widely outside Facebook and to fork into what's now Trino, becoming something close to a default choice for interactive SQL over large-scale data lakes across the industry. The underlying lesson behind Presto's success wasn't a single clever trick — it was recognizing that "large data" and "interactive latency" are different requirements that a single batch-oriented engine can't satisfy well simultaneously, and that serving both well required a purpose-built execution engine rather than tuning the batch engine's existing knobs further.

## Operational gotchas of interactive SQL over a lake

Presto made Hive data feel like a warehouse you can poke during a meeting. That success creates the failure mode: every dashboard, ETL, and curious JOIN lands on the same cluster, and a single cartesian product starves the incident query you needed in seconds. Mid-size teams steal Trino/Presto and skip isolation. Put admission control, per-user memory limits, and a separate cluster or queue for on-call before you advertise "interactive."

Another gotcha is the connector lie. Queries that are fast on a well-partitioned Hive table become scans of JSON on S3 with no statistics. Users blame Presto; the table is a dump. Steal a curated layer: partitioned, typed, with stats, and a rule that production dashboards cannot query raw event slime. Schema evolution in the lake — adding columns, changing partition spec — breaks readers that cached metadata. Coordinator OOMs on planning a query with thousands of partitions are a classic outage that looks like "SQL is down." Cost-based optimization without stats will pick broadcast joins that blow workers. Mid-size steal: one well-owned mart for the questions leadership actually asks, plus Presto for exploration with timeouts. Petabyte scale is not required for the politics of shared interactive SQL to appear; a few terabytes and twenty analysts is enough.

## What you can borrow

- A query engine optimized for large batch jobs and one optimized for interactive exploration are different tools solving different latency requirements; forcing one engine to do both usually means one workload suffers.
- In-memory, pipelined execution that avoids writing intermediate results to disk between stages is one of the highest-leverage changes you can make to cut query latency, when your current engine's overhead comes from exactly that.
- A pluggable connector architecture lets one query engine serve multiple underlying data sources, saving you from maintaining a separate query tool per storage system.
- Before building a new engine, confirm the bottleneck is genuinely architectural (as MapReduce's per-job overhead was for Hive) rather than something tunable in your current system — a new engine is a large investment only worth making once tuning has been ruled out.
