---
title: "Atlas: Why Netflix Built Its Own Metrics System Instead of Buying One"
slug: "netflix-atlas-dimensional-time-series-telemetry"
description: "How Netflix's Atlas telemetry platform handles dimensional time-series data at a scale where most off-the-shelf monitoring systems fall over."
publishedAt: "2025-08-08"
category: "Netflix"
tags:
  - Engineering at Scale
  - Netflix
  - Observability
  - Time Series
sources:
  - title: "Netflix Technology Blog"
    publisher: "Netflix"
    url: "https://netflixtechblog.com"
  - title: "Atlas"
    publisher: "Netflix Open Source"
    url: "https://netflix.github.io"
---

Operating thousands of microservices across hundreds of AWS autoscaling groups generates a volume of metrics that most monitoring tools of the early 2010s simply weren't built to handle. Netflix needed to track not just whether a service was up, but dimensional breakdowns — latency by region, by instance type, by API endpoint, by client version — and needed engineers to be able to query and visualize that data within seconds during an active incident, not minutes later after a batch job caught up. That combination of scale and query latency requirements is what led Netflix to build Atlas.

## In-memory by design

Atlas's core architectural bet is holding recent time-series data in memory across a cluster of nodes rather than treating a disk-backed database as the hot path for queries. Dashboards and ad hoc queries during an incident need to return in seconds, and an on-call engineer trying to understand a live outage can't wait on a slow query against disk-backed storage. Older data ages out of the in-memory tier and into cheaper, disk-backed longer-term storage, which is queried less frequently and can tolerate higher latency, giving Atlas a two-tier storage model that matches each tier's cost to how often it's actually accessed.

That design reflects a conscious prioritization: Atlas trades some flexibility and cost efficiency for query speed on recent data, because recent data is disproportionately what engineers need during the moments that matter most — active incidents and recent deploys.

## Dimensional data at high cardinality

Unlike simple named counters, Atlas metrics are dimensional — a single metric name like request latency can be tagged with many dimensions (region, instance, endpoint, status code) and queried by slicing across any combination of them. That's enormously more useful for debugging than flat metric names, but it also means the number of distinct time series ("cardinality") can explode if dimensions aren't managed carefully — a metric tagged by both instance ID and a high-cardinality request parameter can generate more unique series than any system can practically store. A meaningful part of operating Atlas at Netflix's scale is managing that cardinality risk: providing guardrails, aggregation, and guidance so teams get the dimensional flexibility they need without accidentally generating unbounded time-series growth.

Netflix built its own query language for Atlas, designed around stack-based expressions that compose well for the kind of exploratory, multi-dimensional queries engineers run during investigations — summing across one dimension, grouping by another, comparing against a baseline from the same time last week — operations that are awkward to express in simpler query languages built around single flat metric names.

## Built for Netflix's scale, then open sourced

Netflix evaluated available metrics systems and concluded none handled the combination of cardinality, ingestion rate, and query latency Netflix needed, so it built Atlas as internal infrastructure and later open sourced it. That's a recurring judgment call at Netflix's scale: build versus buy isn't a philosophical preference, it's a case-by-case evaluation of whether existing tools survive contact with actual production volume, and for telemetry at Netflix's scale in that era, the answer was no.

## What you can borrow

- Separate your hot-path storage from your cold-path storage, and match each tier's cost and access pattern to how often it's actually queried.
- Design dimensional metrics deliberately, with cardinality limits and guardrails, rather than letting tag explosion become a scaling crisis later.
- Optimize query latency for the moments that matter most — active incidents — even if that means accepting higher infrastructure cost for recent data.
- Before building custom infrastructure, honestly evaluate whether existing tools survive your actual scale rather than the scale they were designed for.
- If you do build something custom and it proves broadly useful, consider open sourcing it — the operational feedback from external users tends to make the tool better.
