---
title: "Samza: Making Stream Processing a First-Class Citizen Next to Kafka"
slug: "linkedin-samza-stream-processing-first-class-citizen"
description: "How LinkedIn built Apache Samza to pair with Kafka, using partitioned logs and local state to make stateful stream processing durable and rebalanceable."
publishedAt: "2025-06-18"
category: "LinkedIn"
tags:
  - Engineering at Scale
  - LinkedIn
  - Kafka
  - Stream Processing
---

Once Kafka existed as LinkedIn's central log, a new problem showed up almost immediately: dozens of teams wanted to compute something continuously from those streams — enriching an event with profile data, computing rolling counts for relevance models, joining two topics together — and they were all solving the same infrastructure problems from scratch. Checkpointing progress, recovering from failure without reprocessing everything or dropping events, and managing local state that could grow larger than memory were being reinvented team by team, usually badly. LinkedIn built Samza to make stream processing a first-class piece of infrastructure with the same seriousness that Kafka gave to the log itself, rather than treating it as an afterthought bolted onto whatever compute framework happened to be handy.

## Borrowing Kafka's own abstractions for state

The defining decision in Samza's design was to lean on Kafka's partitioning model instead of inventing a separate one. A Samza job is a set of tasks, each assigned one or more Kafka partitions, and each task processes its partitions independently and in order. Because Kafka already guarantees ordering within a partition and durability across the cluster, Samza didn't need to build its own replicated log for input data — it just consumed one that already existed.

The more distinctive piece was how Samza handled local state. Instead of keeping all state in memory or reaching out to a remote store for every lookup, each task got its own embedded key-value store (backed by RocksDB) co-located with the task. That store was also continuously backed up to a dedicated Kafka "changelog" topic. If a task died and was rescheduled elsewhere, Samza could rebuild its local state by replaying the changelog rather than recomputing from the beginning of time or losing state entirely. This meant jobs could hold state far larger than fits comfortably in memory — counters, windows, join tables — while still recovering cleanly from failure.

```
input partition --> task (local RocksDB state) --> changelog topic (Kafka)
                                    |
                                    v
                              output topic
```

## Fault tolerance without a special-purpose coordinator

Samza deliberately reused existing infrastructure rather than building new coordination machinery. Early versions ran on YARN for resource allocation and process management, treating a stream processing job much like a long-running YARN application instead of inventing a bespoke cluster manager. Task-to-partition assignment and checkpointing followed the same "the log is the source of truth" philosophy as the rest of LinkedIn's streaming stack: a task's position was just an offset into its input partitions, checkpointed periodically, so recovery meant resuming from the last checkpoint and replaying forward.

This gave Samza at-least-once processing semantics by default, which was sufficient for the great majority of internal use cases — counting, joining, enriching — where idempotent downstream writes made occasional reprocessing harmless.

## Powering relevance and monitoring pipelines

Samza became the engine behind a wide range of LinkedIn's real-time pipelines: computing derived metrics and relevance signals feeding features like the news feed and notifications, powering call-graph and operational monitoring by processing service log streams in real time, and handling the kind of continuous joins and aggregations that would otherwise have required either brittle in-house code or a slow batch round-trip through Hadoop. LinkedIn open sourced Samza and it became an Apache project, used alongside Kafka at other companies that had adopted the same log-centric architecture.

## What you can borrow

- If you already have a durable, partitioned log, build your stream processor's fault tolerance on top of it rather than inventing a parallel durability mechanism.
- Co-locating local state with the task that owns it, backed by a changelog for recovery, scales further than routing every state lookup over the network.
- At-least-once semantics plus idempotent writes is usually good enough — exactly-once is expensive to guarantee and often unnecessary for the actual use case.
- Reuse your existing resource manager and log infrastructure for coordination instead of building bespoke cluster-management machinery for a new subsystem.
