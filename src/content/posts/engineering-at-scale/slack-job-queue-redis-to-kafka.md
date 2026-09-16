---
title: "Slack's Job Queue Overhaul: From Redis to Kafka"
slug: "slack-job-queue-redis-to-kafka"
description: "Why Slack outgrew a Redis-backed job queue as its job volume and job diversity exploded, and what moving the queue to Kafka bought in return."
publishedAt: "2025-06-15"
updatedAt: "2026-09-16"
category: "Slack"
tags:
  - Engineering at Scale
  - Slack
  - Kafka
  - Job Queues
---

For years, Slack's asynchronous job processing — sending notifications, indexing messages for search, running integrations, and dozens of other background tasks triggered by user activity — ran on a Redis-backed queue. That made sense early on: Redis is fast, simple to operate, and a natural fit for a straightforward queue when job volume and variety are modest. As Slack's workspace count and message volume grew, and as the number of distinct job types multiplied across an increasingly large engineering organization, the Redis-based queue started showing cracks that weren't really about Redis being slow — they were about the queue's design not matching the shape of the problem it had grown into.

## The problems that weren't really about speed

A single shared Redis queue (or a modest number of them) meant that job types with very different priority and latency requirements were competing for the same underlying resource. A burst of low-priority, high-volume jobs could crowd out latency-sensitive ones, and there wasn't a clean way to isolate or independently scale processing capacity per job type without operationally multiplying the number of Redis instances and queues to manage. Redis's in-memory nature also meant queue depth was fundamentally bounded by available memory, which became an increasingly uncomfortable constraint as both job volume and the size of individual job payloads grew. On top of that, visibility into what was actually happening in the queue — backlogs, failure rates, retry behavior per job type — required custom tooling that the team had to build and maintain itself, since Redis wasn't designed to be introspected as a queue in the first place.

## Why Kafka's model fit better

Slack's move to a Kafka-backed job queue wasn't just a storage swap — it changed the queue's underlying model. Kafka's partitioned log gave Slack a natural way to isolate job types (or groups of related job types) into their own topics, letting each be scaled, monitored, and rate-limited independently rather than sharing one undifferentiated queue. Kafka's disk-backed, replicated log also removed the memory-bound ceiling that had constrained the Redis-based approach, and durable retention meant a consumer falling behind temporarily (during a deploy, or a downstream dependency outage) didn't risk losing queued work the way a memory-constrained queue under pressure might.

```
job producer --> Kafka topic (per job type / job group) --> consumer group processes jobs
                                    |
                         retained on disk, replicated, independently scalable per topic
```

Kafka's consumer group model also gave Slack a cleaner scaling story: adding processing capacity for a specific job type meant adding consumers to that topic's consumer group, with partition-based work distribution handled by Kafka itself, rather than hand-rolling worker coordination against a shared Redis structure.

## Migrating a load-bearing system without breaking production

A job queue is about as load-bearing as internal infrastructure gets — virtually every user-visible action at Slack triggers some asynchronous follow-up work through it, from notification delivery to search indexing. That made the migration itself a significant engineering effort in its own right: Slack had to migrate job types incrementally, validating correctness and performance for each before moving the next, rather than attempting a single cutover of the entire system at once. Running both queueing systems in parallel during the transition, with careful monitoring to catch any regression in job latency or delivery guarantees, was essential to making the migration safe for a system this central to the product's actual functioning.

## Operational gotchas of leaving Redis queues for Kafka

Slack outgrew Redis-as-a-job-queue when durability, fan-out, and replay mattered more than a fast LIST. The failure mode of a mid-size migration is dual-writing jobs to Redis and Kafka with slightly different payloads, so a worker that still listens to Redis does a thing twice. Steal a single producer library and a cutover flag per job type, not a big-bang.

Operational gotcha: Kafka consumer groups that pause during a deploy and then process a compressed spike of "user just typed" jobs that are now meaningless. You need lag SLOs and the right to drop expired work. Redis queues hid this because they were short. Another is using Kafka like a database of pending work without a separate status store; then a rebalance retriggers a side effect. Idempotency remains mandatory. Poison messages that fail deserialization will block a partition if you did not set a dead-letter topic. Slack-shaped workloads mix tiny presence ticks and fat file-processing jobs; put them on different topics. Ordering is per partition: if you partition by user, a hot user stalls their own jobs, which may be correct; if you partition randomly, a user's jobs interleave unsafely. Document the key. Do not move to Kafka because it is fashionable. Move because you can name the Redis failure you hit — flush, failover, memory, no replay — and Kafka actually fixes that one.

## What you can borrow

- Outgrowing infrastructure often isn't about raw speed — it's about the model no longer matching your diversity of use cases (mixed priorities, mixed volumes, mixed latency needs sharing one resource).
- A memory-bound queue has a hard ceiling that a disk-backed, replicated log doesn't — worth considering before job volume forces the migration under pressure rather than by choice.
- Partition-per-topic (or per job type) gives you independent scaling and rate-limiting for free, compared to hand-managing isolation within a single shared queue.
- Migrate load-bearing infrastructure incrementally, job type by job type or service by service, with both systems running in parallel — never cut over a system everything depends on all at once.
