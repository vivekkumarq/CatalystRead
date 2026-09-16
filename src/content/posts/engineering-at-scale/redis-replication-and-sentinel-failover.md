---
title: "Redis Replication and Sentinel: Failover That Is Fast, and Split Brain That Is Forever"
slug: "redis-replication-and-sentinel-failover"
description: "How Redis async replication and Sentinel (or Cluster) elect a new primary, and why a missed replica can still accept writes you will never see again."
publishedAt: "2026-12-13"
updatedAt: "2026-12-13"
category: "Redis"
tags:
  - Engineering at Scale
  - Redis
  - Reliability
  - Distributed Systems
sources:
  - title: "Redis Sentinel"
    publisher: "Redis"
    url: "https://redis.io/docs/latest/operate/oss_and_stack/management/sentinel/"
  - title: "Replication"
    publisher: "Redis"
    url: "https://redis.io/docs/latest/operate/oss_and_stack/management/replication/"
---

Redis replication is asynchronous by default: the primary ships a stream of commands (or a backlog of deltas) to replicas. That is why a failover can lose the last handful of writes, and why Sentinel exists — a distributed set of watchers that vote a replica up when the primary is gone. Redis Cluster is a different packaging of slots plus its own failover. Teams still run Sentinel in front of a classic primary-replica trio because it is what they set up in 2016. The engineering lesson is the same: failover is a consensus problem bolted onto a data structure server that is not Raft for your keys.

## Async means a window

A replica can be seconds behind if the network or the replica's event loop is busy. `WAIT` and acknowledgements exist if you want to pay latency for durability to N replicas. Most cache users do not. Most session-store users should have thought about it. After failover, clients must discover the new primary. Sentinel publishes that; Cluster nodes gossip it. Client libraries that cache a TCP connection to the old primary will write into a node that is now a replica (or is still a zombie primary). Replica-protection configs (`replica-read-only`, Cluster epoch) try to stop the zombie. They are not automatic in every historical setup.

Full resync vs partial resync (`PSYNC` backlog) is the difference between a brief replica lag and a multi-minute cache miss storm when the backlog was too small.

## Sentinel quorum is not a data quorum

Sentinel needs a quorum of Sentinels to agree the primary is down, then to pick a replica (priority, offset). If Sentinels are all in one AZ, you will failover for a blip or fail to failover for a real outage. Split brain: two primaries accepting writes, both replicating to different clients. Redis data does not merge. You choose a survivor and delete the other history. That is why fencing the old primary (STONITH, updating configs, `CLIENT PAUSE`, killing the process) is part of the runbook, not an afterthought.

Cluster mode reduces some operational load and adds hash-slot migration pain. It still has epochs and failover elections. It does not make Redis a CP database for arbitrary multi-key transactions across slots.

## Failure modes of Redis HA

The concrete failure is a primary that paused long enough for Sentinel to failover, then resumed and accepted writes from a client that did not reconnect. Mid-size steal: min-replicas-to-write, Cluster or Sentinel-tested client libraries, and a network policy that prevents the old primary from receiving app traffic after demotion.

Operational gotcha: replica priority 0 on the only node with RAM, so failover picks a tiny box that OOMs. Another is monitoring that pings Redis while the event loop is blocked on a huge command — Sentinel thinks it is down, failovers, the "down" node was just busy. Tune down-after-milliseconds against your worst legitimate command, or ban those commands. Diskless sync and replica backlog sizing belong in capacity planning. If Redis is a cache, maybe you should fail over faster and accept empty: rebuild from source. If Redis is a lock or a stream, you cannot. Name which one you are. Test failover on a schedule, including the client side. A Sentinel that works in staging with three apps is not a Sentinel that works with 200 microservices and DNS TTLs. Document the data-loss window in the SLO.

## What you can borrow

- Treat async replication's lag as data-loss budget; use `WAIT` or a different store if the budget is zero.
- Fence old primaries; do not rely on clients to notice.
- Place Sentinels (or Cluster nodes) across failure domains with a real quorum.
- Rehearse failover including client reconnection, not only `INFO replication`.
