---
title: "Keystone: The Pipeline That Moves Trillions of Events a Day at Netflix"
slug: "netflix-keystone-real-time-stream-processing"
description: "How Netflix built Keystone, its Kafka- and Flink-based real-time data platform, and why it later migrated the processing layer from Samza to Flink."
publishedAt: "2025-12-09"
category: "Netflix"
tags:
  - Engineering at Scale
  - Netflix
  - Data Engineering
  - Stream Processing
---

Every play, pause, rebuffer, rating, and scroll on Netflix generates an event, and those events feed everything from personalization models to operational dashboards to A/B test analysis. Handling that volume in something close to real time — not next-day batch — is the job of Keystone, Netflix's stream processing data platform. It's less a single tool than a managed pipeline connecting hundreds of producers to hundreds of consumers, each with different latency and durability needs.

## Kafka as the backbone, self-service as the goal

At the core of Keystone sits Apache Kafka, used as a durable, high-throughput message bus that decouples event producers (client apps, backend services) from the many teams that want to consume those events. Rather than every team standing up its own Kafka clusters and figuring out routing, retention, and schema management independently, Keystone centralized that as a platform: producers publish events once, and Keystone routes them to whichever downstream sinks and stream processors need them, whether that's a real-time anomaly detector, a data warehouse loader, or a personalization feature pipeline.

The platform team's real product wasn't Kafka itself — Kafka is well-documented open source — it was the self-service layer on top: consistent event schemas, routing configuration teams could manage themselves, monitoring for pipeline health, and enough operational abstraction that individual product teams didn't need deep streaming-infrastructure expertise just to get their events flowing reliably.

## From Samza to Flink

Keystone's stream processing layer originally ran on Apache Samza, but Netflix later migrated the bulk of its stream processing workloads to Apache Flink, a shift that played out over roughly 2017–2018. The move reflected Flink's stronger support for the things Netflix's use cases increasingly needed: more expressive stateful stream processing, better checkpointing and exactly-once semantics, and a more active ecosystem to build on. Migrating a production data platform's processing engine out from under hundreds of active pipelines, without breaking the teams depending on it, is itself a substantial engineering exercise — it isn't just a config change, it's coordinating a company-wide dependency shift while keeping the pipeline continuously operational.

Netflix built "Stream Processing as a Service" (SPaaS) on top of Flink, giving teams templated, managed ways to define stream processing jobs instead of hand-rolling job topology and cluster management for each new use case — extending the same self-service philosophy that made Keystone useful in the first place.

## Operating at a scale where the platform is the product

At Netflix's traffic volume, Keystone routes an enormous number of events daily across a fleet of Kafka clusters, and the operational challenges are less about any single component's throughput and more about routing correctness, schema evolution without breaking consumers, and isolating problems so a misbehaving producer or a runaway consumer doesn't degrade the shared pipeline for everyone else. That's the recurring theme of platform engineering at this scale: the interesting failure modes are rarely in the core technology, they're in the shared-infrastructure dynamics of many independent teams using the same pipes.

## What you can borrow

- Centralize your event bus as a platform with self-service tooling rather than letting every team stand up its own ad hoc pipeline.
- Decouple producers from consumers explicitly — a durable message bus buys you the freedom to add, remove, or replace consumers without touching producers.
- Budget real engineering time for migrating core infrastructure components; swapping a processing engine under live traffic is a project, not a config flag.
- Treat schema management and routing configuration as first-class platform concerns, not an afterthought once volume grows.
