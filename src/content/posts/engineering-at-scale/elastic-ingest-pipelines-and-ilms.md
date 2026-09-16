---
title: "Ingest Pipelines and ILM: How Elastic Moves Documents In and Indexes Out Without a Cron Wiki"
slug: "elastic-ingest-pipelines-and-ilms"
description: "How Elasticsearch ingest pipelines transform documents on the way in, and how Index Lifecycle Management rolls data from hot to delete without custom jobs."
publishedAt: "2026-12-15"
updatedAt: "2026-12-15"
category: "Elastic"
tags:
  - Engineering at Scale
  - Elastic
  - Observability
  - Data Engineering
sources:
  - title: "Ingest pipelines"
    publisher: "Elastic"
    url: "https://www.elastic.co/guide/en/elasticsearch/reference/current/ingest.html"
  - title: "ILM"
    publisher: "Elastic"
    url: "https://www.elastic.co/guide/en/elasticsearch/reference/current/index-lifecycle-management.html"
---

Two operational problems dominate Elasticsearch in logging and metrics estates: every document arrives ugly, and every document should get cheaper as it ages. Elastic's ingest pipelines are processors that run at ingest (or in ingest nodes / Beats / Logstash) to grok, geoip, drop, and enrich. Index Lifecycle Management (ILM) is the state machine that rolls an index from hot (write + fast search) to warm/cold/frozen/delete based on age or size. Together they replace a pile of cron jobs that someone used to run with `curator` and a prayer.

## Pipelines are code in the cluster

A pipeline is a list of processors with failure handlers. Grok that does not match can drop the document, keep it, or send it to a failure index. Enrich processors that call a policy to join a CMDB are powerful and are a dependency: if enrich is down, ingest stalls or skips. Putting heavy grok on ingest nodes is right; putting it on data nodes that also search is how p99 dies.

Pipeline versioning matters because a bad grok shipped to production is a parse outage. Simulate APIs exist — use them in CI. The alternative is discovering that 40% of logs no longer extract `status_code` after an app change.

## ILM is a product policy

Hot-warm-cold is a cost curve. Rollover on `max_primary_shard_size` or `max_age` creates a new write index so shards do not grow without bound. Shrink and force-merge on warm reduce shard count and segment count for cheaper storage. Frozen/searchable snapshots (in later Elastic versions) push old data to object storage. Delete is the only complete cost control. Teams that never delete will fund Elastic with their entire cloud budget.

Data streams wrap the write alias + ILM pattern so you do not hand-manage `logs-000123`. They are the default you want for append-only observability data. They are not magic for documents that need updates (a data stream's immutability assumptions).

## Failure modes of ingest and lifecycle

The concrete failure is an ILM policy that force-merges on hot nodes during peak, or a rollover that never fires because the alias was bypassed by a client writing a concrete index name. Mid-size steal: clients write to data streams or aliases only, and ILM explain APIs in the on-call runbook.

Operational gotcha: ingest pipeline that does HTTP calls per document. You have built a throttled, recursive outage. Another is a delete phase that is too aggressive for compliance, or too timid for cost. Get legal to sign the retention number. Grok CPU: a slightly wrong pattern that backtracks can 10x ingest CPU. Use dissect when you can. Enrich indexes that are stale will attach yesterday's team owner to today's host. Schedule enrich rebuilds. If ILM gets stuck (`error` in explain), it will not quietly catch up after a cluster yellow; you will run out of disk. Alert on ILM errors and on ingest rejected counts. Steal the idea even without Elastic: lifecycle as a state machine on partitions of data, not as a human who "cleans S3." Test a pipeline change against production samples in CI. Do not grok in production first.

## What you can borrow

- Parse and enrich on a dedicated ingest path with simulated tests in CI.
- Roll indexes by size and age automatically; never let a single write index grow without bound.
- Write only to aliases or data streams so ILM can roll.
- Alert when lifecycle is stuck; disk full is a late symptom.
