---
title: "CockroachDB vs Spanner: TrueTime, Hybrid Clocks, and the Consistency Tax"
slug: "cockroach-vs-spanner-true-time-tradeoff"
description: "Spanner waits out clock uncertainty; CockroachDB combines hybrid logical clocks with uncertainty intervals. Same serializability goal, different physics."
publishedAt: "2026-08-05"
category: "Databases"
tags:
  - Databases
  - Spanner
  - CockroachDB
  - Distributed Systems
sources:
  - title: "Spanner: Google's Globally-Distributed Database"
    author: "James C. Corbett et al."
    publisher: "OSDI 2012"
    url: "https://research.google/pubs/pub39966/"
  - title: "CockroachDB: The Resilient Geo-Distributed SQL Database"
    author: "Rebecca Taft et al."
    publisher: "SIGMOD 2020"
    url: "https://dl.acm.org/doi/10.1145/3318464.3386134"
---

Google Spanner and CockroachDB both sell **serializable SQL** on a replicated keyspace. They do not buy that property the same way. Spanner's TrueTime API returns an interval `[earliest, latest]` guaranteed to contain now, using GPS and atomic clocks in Google's datacenters. A commit can **wait until the interval is past** so that commit timestamps respect global order. CockroachDB runs on commodity clocks plus **hybrid logical clocks** (HLC) and an uncertainty window: if a read lands in an uncertain interval relative to a write, it retries.

## TrueTime is a hardware and operations bet

Spanner's paper (Corbett et al.) is explicit: if ε (clock uncertainty) is small, wait times are small, and you can assign commit timestamps that induce a globally consistent order without a single bottleneck sequencer for every transaction. If you do not have TrueTime, you cannot honestly copy Spanner's commit-wait. Cloud Spanner is that bet as a service. DIY "we'll NTP really well" is not TrueTime; NTP does not give you a closed uncertainty interval with Google's failure model.

Cockroach's SIGMOD 2020 paper describes ranges (shards) with Raft, a sorted KV, and SQL on top — closer to the Spanner architecture diagram than to a single-node Postgres. For time, HLC captures causal ticks plus physical time. **Read uncertainty** can force retries under clock skew. Operators still must bound NTP, but the protocol has a software retry story when skew exceeds assumptions.

```text
Spanner:   commit timestamp t, wait until now > t + ε
Cockroach: HLC ts, if read overlaps uncertainty → restart
```

## Geography is the real product difference

Both systems hurt when a transaction touches rows whose leaseholders are on opposite continents. Spanner's directories and placement, Cockroach's locality-aware partitioning and `FOLLOWER_READS` (on a timestamp in the past) are the knobs. Serializability across the planet is not a free feature of "NewSQL." It is extra RTT.

Cockroach is often chosen because it speaks PostgreSQL wire protocol and runs on your Kubernetes. Spanner is chosen because Google operates the clocks and the placement. Neither erases hot ranges. A monotonically increasing PK will hotspot a range in both.

## What to tell a design review

If the requirement is "no stale reads, globally, on commodity VMs," you are buying retry latency under skew, not Spanner. If the requirement is "multi-region reads of slightly stale data," both offer bounded-staleness or follower-read style escapes — use them on the paths that can tolerate it.

Do not compare TPC-C numbers from a single region to a three-continent deployment. The papers' diagrams hide your WAN. Measure p99 commit with clock skew injected. That experiment is more honest than a feature matrix that says both are "Google-style SQL."

Read Corbett et al. for commit-wait and directories. Read Taft et al. for ranges, Raft, and how Cockroach maps SQL to KV. Then pick the clock story you can actually operate.
