---
title: "How Discord Moved Trillions of Messages From Cassandra to ScyllaDB"
slug: "discord-cassandra-to-scylladb-and-rust-data-services"
description: "Discord's careful, dual-write migration off Cassandra to ScyllaDB, and the parallel move to Rust, both driven by the same enemy: GC pause tails."
publishedAt: "2025-11-25"
category: "Discord"
tags:
  - Engineering at Scale
  - Discord
  - Databases
  - Rust
trending: true
---

Discord stores something close to the full history of every message ever sent across every server on the platform, a dataset that grew from billions to trillions of rows over the years. That data originally lived in MongoDB, and Discord's engineering blog documented an earlier migration from MongoDB to Cassandra as message volume outgrew what their initial setup could handle. Cassandra served them well for years, but at Discord's later scale, it started showing a specific, recurring kind of pain: latency spikes caused by JVM garbage collection pauses, heavy compaction overhead, and the general operational burden of running and tuning a very large Cassandra fleet.

## Evaluating ScyllaDB

Discord's engineers evaluated ScyllaDB, a database designed to be wire-compatible with Cassandra's API but built from scratch in C++ with a shard-per-core architecture. Because it isn't built on the JVM, ScyllaDB doesn't have garbage collection pauses to contend with at all, and its shard-per-core design is built to extract much more predictable performance out of modern multi-core hardware. For Discord, the appeal wasn't just raw throughput — it was tail latency predictability and getting more useful work out of fewer, better-utilized nodes.

## A deliberately slow, careful cutover

Given that message data is about as critical as data gets for a messaging product, Discord didn't attempt a big-bang switch. Their engineering blog described a gradual, dual-write migration: writes went to both Cassandra and ScyllaDB simultaneously, results were validated for consistency between the two systems, the full historical backlog of trillions of existing messages was migrated in the background, and reads were cut over incrementally — table by table and cluster by cluster — rather than flipping the whole system at once. The payoff they reported was substantial: meaningfully fewer database nodes required to serve the same workload, and much smoother, more predictable p99 latency after the cutover completed.

## Rust for the same underlying reason

Separately, Discord has written extensively about rewriting specific high-throughput services in Rust instead of Go. The most cited example is their Read States service, which tracks per-user read and unread status for every channel a user is in — a service with an extremely high write volume relative to most of Discord's other backend components. The original Go implementation suffered periodic latency spikes traceable to Go's garbage collector running under sustained load. Rewriting the service in Rust, which has no garbage collector and instead uses compile-time-enforced memory management, eliminated that entire class of latency spike. Discord reported consistent, significant improvements in both latency and memory usage after the rewrite.

The common thread across both the ScyllaDB and Rust decisions is notable: Discord kept running into the same underlying problem — garbage collector pause tails, whether from the JVM inside Cassandra or Go's runtime inside application services — and eventually treated it as a pattern to solve structurally with GC-less technology, rather than patching each incident as it came up.

## What you can borrow

- When the same class of problem (like GC-driven latency spikes) keeps recurring across different tools and services, treat it as a structural pattern worth solving deliberately, not a series of unrelated incidents.
- Migrate critical stateful systems with dual writes and gradual, reversible cutover — table by table if necessary — rather than a single high-risk switchover.
- Choose technology based on your actual tail-latency requirements (p99, p999), not just average throughput numbers, especially for anything on a hot, high-volume write path.
- A rewrite in a different language is a legitimate fix when the root cause is the runtime itself (like garbage collection behavior), not just the code running on top of it.
