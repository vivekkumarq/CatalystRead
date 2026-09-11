---
title: "PinLater: Asynchronous Job Execution at Pinterest Scale"
slug: "pinterest-pinlater-async-job-execution"
description: "How Pinterest replaced a fragile in-memory queue with PinLater, a durable, pluggable asynchronous job execution system built to survive real production load."
publishedAt: "2025-05-20"
category: "Pinterest"
tags:
  - Engineering at Scale
  - Pinterest
  - Distributed Systems
  - Job Queues
sources:
  - title: "Pinterest Engineering Blog"
    publisher: "Pinterest"
    url: "https://medium.com/pinterest-engineering"
---

A huge share of what happens after someone saves a pin never touches the request that saved it. Notifications need to go out, images need to be resized into a dozen variants, search and recommendation indexes need updating, and spam signals need scoring — all work that has to happen reliably but has no business blocking the user-facing action that triggered it. Pinterest, like most services at scale, pushed this work onto asynchronous job queues early on. The problem was that its first queueing layer, built on an off-the-shelf, largely in-memory message queue, was never designed for the durability and operational demands Pinterest was placing on it, and it started showing cracks well before the company's growth did.

## Where the original queue fell short

An in-memory queue is fast, but fast comes with a tradeoff: if a queue server restarts or crashes, jobs sitting in memory can simply disappear. For transient work that's tolerable; for jobs like sending a password-reset email or finalizing a payment-adjacent action, it isn't. Pinterest's engineers also found the existing system gave them little operational visibility into queue depth, per-job-type failure rates, or the ability to prioritize urgent jobs over bulk background work, and scaling it horizontally as job volume grew meant fighting the system's own assumptions rather than working with them.

## Designing PinLater around durability first

PinLater was built to treat durability as the default rather than a bolted-on feature. Jobs are written to a persistent storage backend before a producer considers them enqueued, so a worker or broker crash doesn't silently drop work. Pinterest deliberately made the storage layer pluggable rather than tied to one database, supporting backends like HBase and sharded MySQL so the team could choose the right storage engine for a given cluster's throughput and durability needs, and swap implementations without rewriting the job-queue abstraction itself.

```text
Producer -> write job to durable backend (HBase / MySQL)
Worker pool -> claim job -> execute -> ack (remove) or retry
Failed job -> backoff + retry, up to a bounded attempt count
```

## Priorities, retries, and keeping noisy jobs from starving urgent ones

Not every asynchronous job is equally urgent, and a queue that treats a bulk reindexing job the same as a time-sensitive notification will eventually let the bulk work crowd out what users actually notice. PinLater supports distinct priority levels and per-job-type queues, so infrastructure teams could isolate a noisy, high-volume job type from a smaller number of latency-sensitive ones instead of contending for the same worker pool. Retries with backoff were built in from the start, since transient failures — a downstream service blip, a lock contention spike — are the normal case at Pinterest's volume, not the exception, and a system that gives up on the first failure or hammers a struggling downstream service with immediate retries just compounds the problem instead of absorbing it gracefully.

## Operability as a first-class requirement

Because so much of Pinterest's product behavior depends on jobs that run outside the request path, PinLater was also built with monitoring and introspection as core functionality rather than an afterthought — queue depth per job type, processing latency, and failure rates needed to be visible enough that an on-call engineer could tell, at a glance, whether a backlog was a transient blip or a sign that a downstream dependency was down. That operational visibility mattered as much to PinLater's success internally as its throughput numbers did, since a queueing system nobody can debug under pressure isn't actually production-ready no matter how fast it processes jobs on a good day.

## What you can borrow

- Treat durability as a default for any asynchronous work with real consequences if it's lost, not an optional upgrade you add after an incident.
- Keep your job storage backend pluggable if you can; the right durability and throughput tradeoff often differs by workload and changes as you scale.
- Isolate high-volume, low-urgency job types from latency-sensitive ones with separate priorities or queues, so noisy work can't starve what users actually notice.
- Build retry-with-backoff in from day one — transient downstream failures are routine at scale, and naive immediate retries make outages worse.
- Invest in per-job-type observability early; a queue's throughput numbers mean little if nobody can tell why a backlog is growing during an incident.
