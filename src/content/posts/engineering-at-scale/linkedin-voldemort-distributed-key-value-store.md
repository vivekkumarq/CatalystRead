---
title: "Voldemort: LinkedIn's Dynamo-Inspired Key-Value Store"
slug: "linkedin-voldemort-distributed-key-value-store"
description: "How LinkedIn adapted Amazon's Dynamo paper into Voldemort, a highly available key-value store built for read-heavy, low-latency online serving."
publishedAt: "2025-05-15"
category: "LinkedIn"
tags:
  - Engineering at Scale
  - LinkedIn
  - Distributed Systems
  - Key-Value Stores
sources:
  - title: "Dynamo: Amazon's Highly Available Key-value Store"
    author: "Giuseppe DeCandia et al."
    publisher: "SOSP 2007"
    url: "https://www.allthingsdistributed.com"
  - title: "Project Voldemort"
    publisher: "LinkedIn"
    url: "https://www.project-voldemort.com"
---

By the mid-2000s, LinkedIn had plenty of data that didn't need the full weight of a relational database to serve: cached recommendations, session data, precomputed lookups that just needed a key and a fast answer. Running this kind of workload against a relational system meant paying for transactional guarantees and query flexibility nobody was using, while still not getting the horizontal scalability or the failover behavior the site actually needed. When Amazon published its Dynamo paper in 2007, describing a highly available key-value store built around consistent hashing and tunable consistency, it gave LinkedIn's infrastructure team a blueprint worth adapting rather than inventing from scratch. The result was Voldemort, an open-source, Dynamo-inspired distributed key-value store built for exactly this kind of read-heavy, low-latency online serving.

## Consistent hashing and pluggable storage

Voldemort partitioned its keyspace across a cluster using consistent hashing, the same technique Dynamo popularized, so that adding or removing nodes only required reshuffling a fraction of the data rather than a full rebalance. Each key was replicated to a configurable number of nodes, and clients could tune the read and write quorum per store — how many replicas had to acknowledge a write, and how many had to agree on a read — trading off consistency, latency, and availability differently for different use cases on the same cluster.

A design choice that distinguished Voldemort from a lot of contemporaries was treating storage as pluggable rather than baked in. The actual persistence layer could be backed by different engines depending on the workload — including embedded storage engines like BDB (Berkeley DB) for read-write workloads and a read-optimized format for data pushed in bulk from Hadoop — with the distribution, replication, and routing logic staying the same regardless of which engine sat underneath a given store.

## Read-only stores fed by Hadoop

One of Voldemort's most distinctive uses at LinkedIn was as a read-only serving layer for data computed offline. A Hadoop job would compute a dataset — recommendations, a derived index, a batch-computed feature — and build an immutable, indexed data file for each partition, which was then pushed out to Voldemort nodes and swapped in atomically. Because these stores never accepted online writes, they sidestepped a lot of the hard problems (conflict resolution, vector clocks, read-repair) that a fully read-write Dynamo-style store has to solve, while still giving Hadoop-computed data a low-latency path into production traffic.

```
Hadoop job --> build partitioned, indexed data files --> push to Voldemort nodes --> atomic swap
```

For the read-write use cases, Voldemort did implement Dynamo-style mechanisms like vector clocks to track causal history across replicas and detect conflicting concurrent writes, letting applications decide how to reconcile them rather than silently picking a winner.

## What you can borrow

- Consistent hashing keeps cluster resizing cheap — plan for it from day one rather than retrofitting it once a store is already large.
- Making storage engines pluggable behind a common distribution layer lets one system serve very different workloads (write-heavy online, bulk-loaded read-only) without forking the codebase.
- A dedicated read-only path for data computed offline is much simpler to build and operate than trying to make a general read-write store handle bulk loads gracefully.
- Tunable per-store read/write quorums let you make the consistency-versus-latency tradeoff per use case instead of picking one setting for an entire cluster.
