---
title: "Venice: Serving Derived Data from LinkedIn's Batch and Stream Pipelines"
slug: "linkedin-venice-serving-derived-data"
description: "Why LinkedIn built Venice to bridge offline-computed and streaming-computed data into a low-latency read-only serving store for machine learning features."
publishedAt: "2025-08-22"
updatedAt: "2026-09-16"
category: "LinkedIn"
tags:
  - Engineering at Scale
  - LinkedIn
  - Machine Learning Infrastructure
  - Data Systems
sources:
  - title: "LinkedIn Engineering Blog"
    publisher: "LinkedIn"
    url: "https://engineering.linkedin.com"
---

A huge share of what LinkedIn serves to members isn't raw data at all — it's derived data: features computed offline in Hadoop for a machine learning model, aggregates computed by a Samza streaming job, embeddings produced by an overnight batch pipeline. All of that computation is worthless if there's no fast way to get the results in front of a live request with single-digit-millisecond latency. For years, teams solved this problem independently, pushing batch output into whatever key-value store they were already using and writing custom ingestion pipelines to keep it fresh. LinkedIn built Venice specifically to be the standard serving layer for this pattern — a system whose entire job is taking data computed elsewhere and making it servable online — rather than adding "also serve batch output" as a side feature bolted onto a general-purpose database.

## Read-only serving, write-heavy ingestion

Venice's core design insight is that this workload looks very different from a typical online database. Writes come in large, bursty batches — a Hadoop job finishes and needs to push an entire dataset, or a streaming job continuously produces incremental updates — while reads are simple, high-volume, low-latency point lookups by key, almost never updates from the serving path itself. Venice embraced that asymmetry rather than fighting it: it's architected around bulk-loading immutable data versions efficiently, and reads are served from local storage on each node without needing to coordinate writes and reads through the same code path a general-purpose database would use.

To keep serving fast during a full dataset refresh, Venice uses versioned pushes: a new version of a dataset is built and validated completely offline, then swapped in atomically once ready, so readers never see a half-updated dataset and a failed push never corrupts what's currently being served.

## Kafka as the ingestion backbone, again

Consistent with the rest of LinkedIn's data infrastructure, Venice uses Kafka as the transport layer between data producers and the storage nodes that serve reads. Both a Hadoop-based batch push and a Samza-based streaming job write into Venice through the same Kafka-mediated ingestion path, which meant Venice could give one consistent story — "produce features here, serve them there" — to teams whether their data pipeline was fundamentally batch, fundamentally streaming, or a hybrid ("lambda-style") combination of both feeding the same dataset.

```
Hadoop batch job  --\
                      --> Kafka topic --> Venice storage nodes --> low-latency reads
Samza stream job  --/
```

## Powering machine learning feature serving

Venice became a core piece of LinkedIn's machine learning infrastructure, serving as the low-latency store behind features and embeddings used by ranking models across the feed, recommendations, and search. Instead of every ML team building and operating its own serving store for offline-computed features, they could produce data into Venice using standard batch or streaming jobs and rely on a shared, well-operated system to make it available to production models with predictable latency. LinkedIn later open sourced Venice, positioning it explicitly as infrastructure for the "derived data serving" problem that other companies running large batch and streaming pipelines tend to hit independently.

## What a mid-size team can steal from Venice

Venice exists because derived data — embeddings, features, recommendations, precomputed views — has different needs than OLTP. It is bulk-loaded, often regenerated, and read with tight latency. Mid-size teams mash that workload into the primary database and then wonder why ETL jobs lock member rows. The steal is a read-only serving store fed by batch and stream, with a clear contract: writers are pipelines, readers are online services, and nobody issues ad-hoc updates to "fix" a feature in prod.

Operational gotcha: a hybrid write path where a stream update races a daily snapshot and last-write-wins based on wall clocks, so a late batch rebuild overwrites a fresher stream event. Version the snapshots, use logical timestamps from the pipeline, and keep a generation number that readers can pin during a rollback. Another failure mode is schema drift between the offline job that trains a model and the online store that serves features; missing features become zeros and model quality falls without a page-level error. Steal feature logging: persist what was served. Capacity-wise, derived stores die from fan-out of fat values. If every member document carries a 200-dimension vector plus a giant map of counters, cache hit rate collapses. Split hot, small keys from cold blobs. You do not need Venice itself until push-job volume and replication across colos is the bottleneck; you do need the read/write role split immediately.

## What you can borrow

- Serving infrastructure for derived/precomputed data has fundamentally different access patterns than a general-purpose online database — don't force it through the same system if you don't have to.
- Atomic dataset version swaps let you refresh an entire serving dataset without readers ever seeing partial or inconsistent state.
- If batch and streaming pipelines both need to feed the same serving layer, give them a single shared ingestion path instead of two separate integrations.
- A dedicated "batch/stream output goes here, gets served fast" system is worth building once several teams are independently reinventing it.
