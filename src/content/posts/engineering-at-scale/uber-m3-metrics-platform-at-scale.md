---
title: "M3: Building a Metrics Platform That Doesn't Fall Over at a Billion Time Series"
slug: "uber-m3-metrics-platform-at-scale"
description: "How Uber built M3, its open-sourced metrics platform, when off-the-shelf time-series tooling couldn't handle its monitoring scale."
publishedAt: "2025-10-28"
updatedAt: "2026-09-16"
category: "Uber"
tags:
  - Engineering at Scale
  - Uber
  - Observability
  - Time Series
sources:
  - title: "M3: Uber's Open Source, Large-scale Metrics Platform for Prometheus"
    publisher: "Uber Engineering Blog"
    url: "https://www.uber.com/blog/engineering/"
---

Every service Uber runs emits metrics — request latency, error rates, queue depths, business metrics like trip counts by city — and as the number of services and hosts grew into the thousands, the volume of distinct time series being written and queried grew right along with it. Uber's engineers found that existing open source time-series databases weren't built for that combination of write volume, cardinality, and long-term retention at once, and rather than keep patching around those limits, they built M3: a metrics platform designed from the start for very large scale.

## M3DB, M3 Aggregator, and M3 Query

M3 isn't a single binary, it's a set of purpose-built components that split the metrics pipeline into separate concerns. M3DB is the distributed time-series database itself, built to store metrics with efficient compression and to serve both recent and long-retention historical data without needing a completely separate system for each. An aggregation layer sits in front of it, downsampling and rolling up raw metrics before they hit long-term storage, since keeping every raw data point at full resolution forever is neither necessary nor affordable at Uber's volume — most queries care about trends and percentiles over a window, not every individual sample. M3 Query provides the query layer applications and dashboards actually talk to, translating queries into the right reads across the underlying storage.

Splitting the pipeline this way — ingestion and aggregation separate from long-term storage, separate again from querying — let each component be scaled and optimized independently, instead of one monolithic time-series database trying to be simultaneously excellent at high-throughput writes, efficient long-term compression, and fast interactive queries.

## Compatible with what people already use

Rather than requiring every team to adopt a new query language or a new instrumentation approach, Uber built M3 to be compatible with Prometheus, supporting Prometheus's remote read and remote write APIs so that teams already using Prometheus-style instrumentation and PromQL-style querying could point at M3 as a scalable backend instead of needing to run and scale Prometheus's own storage themselves. That compatibility mattered enormously for adoption — it meant M3 could slot underneath existing monitoring practices rather than forcing a rip-and-replace of every team's dashboards and alerting rules.

## Open sourcing it

Uber open sourced M3 in 2018, framing it explicitly as infrastructure built to solve a scale problem the existing open source ecosystem didn't yet address well: very high cardinality metrics (many unique combinations of labels, which is common when you tag metrics by things like host, service, and endpoint), long retention windows, and multi-tenant usage across an organization with hundreds of independent teams all emitting metrics into the same shared platform. That combination — massive scale plus multi-tenancy plus compatibility with existing tooling — is a fairly specific niche, and M3 became one of the reference options for organizations that outgrew simpler single-node time-series setups.

## Operational gotchas of a high-cardinality metrics stack

M3 existed because Uber's dimensional metrics volume would wreck a naive Graphite. The failure mode at smaller companies is installing M3/Prometheus/Victoria and then tagging metrics with trip_id. Cardinality is the outage. Mid-size steal: recording rules, tag allowlists, and a budget per team in series count.

The concrete failure mode is a deploy that adds a label; ingest falls behind; alerts evaluate on stale data; people disable alerts. Another is mixed retention: you need 15s for 24h and 1m for 90d, and one setting for both either bankrupts you or blinds you. Operational gotcha: aggregators that are themselves a SPOF. Watch the watchers with a second, dumb heartbeat. Uber could dedicate a metrics org. You can run Grafana Cloud or a single Prometheus with Thanos and the same social rules. Exemplars and traces still need a correlation id; M3 does not replace logs. If on-call dashboards are 60 unscoped queries, they will time out during the incident. Precompute the board. The steal is treating metric series as a finite resource, with the same seriousness as disk on the primary database. A metrics platform that cannot be paged for its own lag is incomplete.

## What you can borrow

- Decompose an observability pipeline into ingestion, aggregation, storage, and query layers so each can scale independently rather than forcing one system to do everything well.
- Downsample and aggregate deliberately — very few queries actually need full-resolution data held forever.
- Build compatibility with existing tooling and query languages into new infrastructure; forcing a wholesale instrumentation rewrite kills adoption.
- Cardinality, not raw data volume, is often the real scaling constraint on metrics systems — design for it explicitly rather than discovering it in production.
