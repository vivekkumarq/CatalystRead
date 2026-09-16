---
title: "Spanner and TrueTime: How Google Made Globally Consistent Transactions Possible"
slug: "google-spanner-truetime-globally-consistent-transactions"
description: "How Google used GPS and atomic clocks to bound time uncertainty and give Spanner globally consistent ACID transactions across continents."
publishedAt: "2025-06-19"
updatedAt: "2026-09-16"
category: "Google"
tags:
  - Engineering at Scale
  - Google
  - Distributed Systems
  - Databases
sources:
  - title: "Spanner: Google's Globally-Distributed Database"
    author: "James C. Corbett et al."
    publisher: "OSDI 2012"
    url: "https://research.google"
---

Distributed databases have long faced a hard tradeoff: spread data across multiple datacenters for availability and locality, and you generally give up strong consistency, because there's no cheap way to know the true global order of transactions happening on opposite sides of the planet at nearly the same instant. Google needed both — global distribution for products like AdWords billing, and strict consistency because billing systems can't tolerate ambiguity about transaction order. Their answer, described in the 2012 OSDI paper "Spanner: Google's Globally-Distributed Database," was to attack the problem at its root: clock uncertainty.

## The clock problem

In any distributed system, servers' clocks drift relative to each other, and standard NTP synchronization leaves uncertainty of tens of milliseconds or more. If you assign a single timestamp to each transaction and trust it blindly, two transactions on different machines can appear to happen "at the same time" when they didn't, or worse, appear out of order relative to their real-world sequence. Most systems sidestep this by avoiding cross-machine timestamp ordering entirely, using logical clocks or accepting weaker consistency guarantees.

## TrueTime: time as an interval

Google's approach was to make clock uncertainty explicit and boundable rather than pretending it doesn't exist. TrueTime, the API underlying Spanner, doesn't return a single timestamp — it returns an interval `[earliest, latest]` guaranteed to contain the true current time. That interval is kept narrow (typically a few milliseconds) by equipping datacenters with GPS receivers and atomic clocks as redundant, cross-checked time sources, rather than relying purely on network-synchronized clocks.

## Commit-wait

The interval enables a technique called commit-wait. When Spanner commits a transaction, it assigns it a timestamp and then deliberately waits out the remaining uncertainty in that timestamp's interval before making the transaction's effects visible. This guarantees that by the time any other transaction could possibly observe the write, real time has actually advanced past the assigned timestamp everywhere in the system. The result is external consistency (a form of strict serializability): if transaction A commits before transaction B starts, in real time, then A's timestamp is guaranteed to be smaller than B's, globally, without requiring a central coordinator for every transaction.

Under the hood, Spanner replicates data using Paxos within each shard for fault tolerance, and coordinates multi-shard transactions with two-phase commit layered on top of those Paxos groups. TrueTime and commit-wait are what let this machinery produce timestamps that mean something globally, not just within one datacenter.

| Component | Role |
|---|---|
| TrueTime API | Bounds clock uncertainty using GPS + atomic clocks |
| Commit-wait | Waits out uncertainty before exposing a commit |
| Paxos | Replicates each data shard for fault tolerance |
| Two-phase commit | Coordinates transactions spanning multiple shards |

Spanner shipped as ACID, SQL-capable, and globally distributed with very high availability targets, and later became the basis for the public Cloud Spanner product. It remains one of the clearest examples of a distributed-systems problem solved by improving the underlying physical infrastructure (better clocks) rather than only the software protocol.

## What broke when they scaled

Multi-region databases without a time bound cannot order transactions: you pick between linearizability and availability, or you use ugly workarounds. Spanner (Corbett et al., OSDI 2012) uses TrueTime — GPS and atomic clocks exposing an interval, not a point — and *commit-wait* so a transaction's timestamp is guaranteed in the past for later readers. The scaling break is commit latency: you wait out uncertainty `ε`. If clocks are poorly synced, `ε` grows and transactions crawl. Spanner's engineering is as much clock discipline and Paxos groups per directory as it is SQL.

What also breaks is treating Spanner like a local Postgres: chatty ORM round-trips across continents, hot ranges, and schema designs that ignore locality. External consistency is real; it is not free. Google Cloud Spanner is the public descendant; the paper's TrueTime API is the idea people should remember, not "Google has magic clocks" as a meme.

## A smaller-team version of the same idea

Single-region Postgres with sync replicas. If you need cross-region reads of slightly old data, use replica reads and accept staleness. CockroachDB and Cloud Spanner exist when you need the Spanner-shaped contract without GPS racks. Do not invent TrueTime with NTP and hope; commit-wait with a large `ε` is just a slow database.

## What you can borrow

- Treat clock uncertainty as a first-class, bounded quantity in any system that orders events across machines, rather than assuming synchronized clocks.
- If you can't deploy atomic clocks, hybrid logical clocks or NTP with a known, monitored error bound still let you reason explicitly about ordering guarantees instead of hoping.
- Before reaching for a globally consistent design, check whether your product actually needs global ordering — many systems only need consistency within a region or a single customer's data.
- Understand what commit-wait-style techniques cost you: latency traded for stronger guarantees is a real tradeoff, not a free lunch.
