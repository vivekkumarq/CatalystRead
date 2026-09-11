---
title: "Brooklin: Generic Streaming Pipes Between LinkedIn's Systems"
slug: "linkedin-brooklin-streaming-data-pipes"
description: "How LinkedIn built Brooklin as a single, generic streaming pipeline service to replace a sprawl of one-off connectors moving data between Kafka, Espresso, and beyond."
publishedAt: "2026-03-15"
category: "LinkedIn"
tags:
  - Engineering at Scale
  - LinkedIn
  - Streaming
  - Data Infrastructure
sources:
  - title: "LinkedIn Engineering Blog"
    publisher: "LinkedIn"
    url: "https://engineering.linkedin.com"
---

By the mid-2010s LinkedIn had Kafka as its central log, Espresso and other stores as sources of change data, and dozens of systems that needed data moved reliably between all of them — mirroring Kafka topics across data centers, streaming Espresso changes into derived stores, bridging data into and out of external systems. Each of these pipelines had historically been built as its own bespoke connector, duplicating the same hard problems — partition assignment, checkpointing, failure recovery, backpressure — with slightly different bugs each time. Databus had solved change capture specifically, and Kafka's own MirrorMaker handled Kafka-to-Kafka replication, but neither was a general answer to "move a stream of data from source system X to destination system Y reliably." LinkedIn built Brooklin as a single, generic streaming data pipeline service meant to replace that sprawl of one-off connectors with one configurable, operable piece of infrastructure.

## Pluggable connectors on a shared runtime

Brooklin's architecture separated the generic, reusable machinery of running a streaming pipeline from the source- and destination-specific logic of actually reading and writing a given system. A shared runtime handled task distribution across a cluster, partition assignment and rebalancing when nodes joined or left, checkpointing progress, and failure recovery — the same undifferentiated heavy lifting every connector had previously reimplemented independently. On top of that runtime, individual connectors plugged in the specifics: a Kafka-mirroring connector knew how to read from and write to Kafka topics, a change-capture connector knew how to consume from a source database's change stream, and so on, but none of them needed to solve distribution or fault tolerance themselves.

```
source system --> connector (source-specific read logic)
                        |
                 Brooklin runtime (task distribution, checkpointing, rebalancing)
                        |
               connector (destination-specific write logic) --> destination system
```

This plugin model meant adding support for a new source or destination was a matter of implementing a well-defined connector interface, not standing up a new distributed system from scratch.

## Multi-tenant by design

Because Brooklin was meant to replace many independent pipelines rather than be stood up fresh for each one, it was built to run many datastreams — Brooklin's term for a configured pipeline instance — multi-tenant on a shared cluster, with per-datastream configuration for things like throughput limits and topic mappings. This let LinkedIn operate one Brooklin deployment serving many teams' pipelines rather than each team running and maintaining its own dedicated pipeline infrastructure, consolidating both the operational burden and the engineering effort that used to be duplicated per pipeline.

## Replacing point-to-point sprawl with one operable system

The payoff mirrored what Kafka itself had delivered a few years earlier: instead of an integration problem that grew with the number of systems, LinkedIn had one piece of infrastructure that a new pipeline could be configured into, with consistent operational characteristics, consistent monitoring, and a single team of experts who understood its failure modes deeply instead of that knowledge being scattered thinly across every team that had ever built a one-off connector.

## What you can borrow

- When you notice multiple teams reimplementing the same distribution, checkpointing, and failure-recovery logic for different pipelines, that's a signal to extract a shared runtime rather than let each team keep reinventing it.
- A pluggable connector interface lets you add new sources and destinations incrementally without redesigning the core system each time.
- Multi-tenancy from the start — one cluster serving many pipelines with per-pipeline configuration — is usually cheaper to operate than one dedicated cluster per pipeline, even though it demands more careful resource isolation.
- Consolidating scattered point-to-point integrations into one general system pays off in operational knowledge as much as in code: one team can become deeply expert in one system's failure modes.
