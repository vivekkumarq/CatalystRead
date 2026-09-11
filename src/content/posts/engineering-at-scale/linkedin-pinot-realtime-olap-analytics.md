---
title: "Apache Pinot: Real-Time OLAP for Member-Facing Analytics"
slug: "linkedin-pinot-realtime-olap-analytics"
description: "Why LinkedIn built Pinot to answer analytical, slice-and-dice queries directly in member-facing products with sub-second latency at huge scale."
publishedAt: "2025-11-12"
category: "LinkedIn"
tags:
  - Engineering at Scale
  - LinkedIn
  - OLAP
  - Real-Time Analytics
sources:
  - title: "Apache Pinot"
    publisher: "Apache Software Foundation"
    url: "https://pinot.apache.org"
  - title: "LinkedIn Engineering Blog"
    publisher: "LinkedIn"
    url: "https://engineering.linkedin.com"
---

Features like "Who Viewed My Profile" and various dashboards showing members how their posts and profile were performing had a requirement that didn't fit neatly into either of LinkedIn's existing camps of infrastructure. This wasn't a simple key-value lookup — members wanted to filter, group, and slice the data ("views this week, by industry, excluding people at my own company"), which is fundamentally an analytical query pattern. But it also wasn't a traditional data-warehouse workload, because these queries were coming directly from live product traffic and needed sub-second responses at very high query volume, not the multi-second-to-minutes latency acceptable for an internal analyst running a report. Existing OLAP systems were built for internal, lower-QPS analytical workloads, not for sitting directly behind member-facing product surfaces. LinkedIn built Pinot to close that gap: a real-time distributed OLAP datastore designed to serve analytical queries at product latency and product scale.

## Columnar storage with heavy indexing

Pinot stores data in a columnar format and leans hard on indexing to make slice-and-dice queries fast without scanning entire datasets. Segments — Pinot's unit of storage — carry dictionary encoding, inverted indexes, and other structures that let the query engine prune irrelevant data early, which matters enormously when a query might touch billions of rows but only needs to aggregate a small filtered slice of them. Data is partitioned and each partition further split into segments, which lets queries fan out across a cluster and get executed in parallel, with a broker layer merging partial results from each server into a single final answer.

## Hybrid real-time and offline ingestion

Consistent with the rest of LinkedIn's data infrastructure, Pinot ingests real-time data by consuming directly from Kafka, converting streaming events into queryable, indexed segments with latency low enough that events show up in queries within seconds of occurring. For historical data, Pinot also supports offline ingestion from Hadoop, batch-building segments for data older than the real-time retention window. A single Pinot table can be configured as a hybrid of both: a real-time segment covering recent data and offline segments covering everything older, queried transparently as one logical table so the application layer doesn't need to know or care which path served a given result.

```
Kafka stream --> real-time segments (seconds-old data)
Hadoop batch --> offline segments (historical data)
                        \
                    hybrid table --> broker --> query fan-out --> merged result
```

## Serving analytics at product scale, not just dashboards

What set Pinot apart from general-purpose OLAP engines was the assumption from day one that queries would come from live product traffic at high volume and tight latency budgets, not from a handful of analysts running ad hoc reports. That assumption shaped everything from the indexing strategy to the broker/server split to the emphasis on predictable tail latency over raw query flexibility. LinkedIn open sourced Pinot and it became an Apache project, subsequently adopted well beyond LinkedIn for exactly this pattern: real-time, user-facing analytics rather than purely internal business intelligence.

## What you can borrow

- Distinguish "analytics for internal analysts" from "analytics embedded in a live product" early — the latter needs a fundamentally different latency and QPS budget, not just a faster version of the same tool.
- Heavy indexing and columnar storage pay for themselves when the same dataset is queried with many different filter and group-by combinations, rather than a small set of known query shapes.
- Hybrid real-time-plus-offline tables let you get seconds-fresh data without paying to reprocess your full historical dataset through the streaming path.
- If you already have a Kafka-centric pipeline, an OLAP layer that ingests directly from it avoids building a separate batch-loading pipeline just to keep analytics current.
