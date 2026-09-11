---
title: "Scuba: Real-Time Analytics for Debugging Production at Facebook"
slug: "meta-scuba-real-time-in-memory-analytics"
description: "How Facebook built Scuba, an in-memory analytics engine that trades storage cost and precision for sub-second answers engineers need while debugging live incidents."
publishedAt: "2026-02-14"
category: "Meta"
tags:
  - Engineering at Scale
  - Meta
  - Data Infrastructure
  - Observability
sources:
  - title: "Scuba: Diving into Data at Facebook"
    author: "Lior Abraham et al."
    publisher: "VLDB 2013"
    url: "https://research.facebook.com"
---

When something breaks in production, the value of an analytics query is almost entirely about how fast you get an answer. An engineer debugging a live incident doesn't want a beautifully optimized query that returns in twenty minutes against a data warehouse tuned for overnight reporting jobs — by the time that query finishes, the incident may already be over, or worse, still ongoing and still unexplained. Facebook's existing data infrastructure, built around systems like its Hive-based warehouse, was optimized for exactly the opposite trade-off: high throughput and efficient storage over very large historical datasets, at the cost of query latency measured in minutes rather than seconds.

## Optimizing for time-to-answer over storage efficiency

Facebook's response was Scuba, an analytics system built around a deliberately unusual trade-off for a data system at this scale: keep data in memory, distributed across many machines, and accept that this is a far more expensive way to store data than writing it to disk, in exchange for sub-second query responses over recent data. Scuba's tables are structured as flat, wide rows — closer to a single denormalized event log than a normalized relational schema — which avoids the cost of joins at query time and lets Scuba scan and aggregate data quickly across a cluster of machines holding shards of that in-memory data.

## Trading precision for speed when it doesn't matter

Because Scuba's primary use case is interactive debugging rather than financial-grade reporting, it leans into approximate answers where exactness isn't worth the latency cost: aggregations can sample data rather than scan every row when a query touches a very large volume, trading a small amount of statistical accuracy for a query that returns in a second instead of tens of seconds. For an engineer trying to figure out whether error rates spiked in one data center starting at a specific minute, a sampled answer that's accurate to within a reasonable margin is far more useful than an exact answer that arrives too late to matter for the incident at hand.

## Built for exploration, not fixed dashboards

Scuba's query interface was designed around ad hoc, exploratory analysis rather than a fixed set of predefined dashboards: an engineer could pivot a query along a different dimension, add a filter, or drill into a specific subset of events, and get a new answer back in about the same sub-second time, encouraging the kind of rapid, iterative "what if I slice it this way instead" investigation that fixed dashboards don't support well. That interactivity turned out to matter as much as raw query speed — a fast query tool that only answers pre-built questions doesn't help much when you don't yet know which question you need to ask.

## What you can borrow

- When the value of a query depends heavily on how fast it returns (debugging, incident response), it's worth deliberately trading storage cost or precision for latency rather than optimizing for the storage-efficient default.
- Denormalized, flat data layouts avoid expensive joins at query time, at the cost of storing more redundant data — a trade worth making specifically for your fastest, most latency-sensitive query paths.
- Approximate, sampled results are often good enough for exploratory and debugging use cases; reserve exact computation for the reporting paths that actually require it.
- Tooling that supports open-ended, iterative exploration (repivoting, refiltering, drilling down) is more valuable during an incident than a fixed set of predefined dashboards, because you often don't know the right question until you've already started asking others.
