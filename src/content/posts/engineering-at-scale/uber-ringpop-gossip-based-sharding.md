---
title: "Ringpop: Sharding Uber's Stateful Services Without a Central Coordinator"
slug: "uber-ringpop-gossip-based-sharding"
description: "How Uber's Ringpop library used consistent hashing and a gossip protocol to shard stateful services without depending on a single coordinator."
publishedAt: "2025-07-15"
updatedAt: "2026-09-16"
category: "Uber"
tags:
  - Engineering at Scale
  - Uber
  - Distributed Systems
  - Sharding
sources:
  - title: "Ringpop: Application-Layer Sharding for Node.js Applications"
    publisher: "Uber Engineering Blog"
    url: "https://www.uber.com/blog/engineering/"
---

Stateless services scale by just adding more instances behind a load balancer, but stateful services — the kind that hold in-memory state a specific request needs to reach consistently, like Uber's early dispatch and matching systems — don't get that luxury. Route the wrong request to the wrong node and it either can't find the state it needs or has to fetch it over the network, defeating the point of holding it in memory in the first place. Uber built Ringpop to solve that problem: a library that gives an application-level cluster the ability to shard work across its own nodes without depending on an external coordination service.

## Consistent hashing, minus a single point of failure

Ringpop's sharding is based on consistent hashing: each node in the cluster and each piece of work (identified by a key) get mapped onto positions on a hash ring, and a piece of work is owned by whichever node is "next" on the ring from its position. Consistent hashing's well-known advantage is that adding or removing a node only reshuffles a small fraction of the keys near it on the ring, rather than remapping everything — critical for a cluster that scales up and down regularly and can't afford a full state migration every time membership changes.

The harder problem consistent hashing alone doesn't solve is: how does every node agree on who's currently in the cluster, without a centralized coordinator like ZooKeeper or etcd becoming a bottleneck or single point of failure? Ringpop's answer was to build membership on top of a gossip protocol rather than a centralized store.

## SWIM: membership by rumor, not by roll call

Ringpop implements a version of SWIM (Scalable Weakly-consistent Infection-style process group Membership), a protocol where nodes periodically ping a random peer to check it's alive, and membership changes — a node joining, leaving, or being suspected dead — spread through the cluster the way a rumor spreads through a social network, node to node, rather than through a central registry that every node has to consult. That gossip-based approach scales well because the load per node stays roughly constant as the cluster grows; nobody is fielding membership queries from every other node simultaneously.

The tradeoff is that gossip-based membership is eventually consistent rather than immediately consistent: a node crash isn't detected by everyone at the same instant, there's a propagation delay while the rumor spreads. For Uber's use case — routing requests to the right in-memory shard owner — a brief window of stale membership information was an acceptable tradeoff against the alternative of making every node dependent on a centralized coordination service's uptime.

## Built on top of, and alongside, TChannel

Ringpop was designed to work with TChannel, Uber's RPC framework of that era, which handled connection multiplexing and request forwarding — letting a request arrive at any node in the Ringpop cluster and get forwarded transparently to whichever node actually owns the relevant shard, without the caller needing to know the ring's current membership itself. That combination — an RPC layer that can forward requests, plus a membership and hashing layer that decides where they should go — let application teams get sharding and ownership semantics without hand-rolling cluster coordination for every new stateful service.

## A concrete failure mode for gossip membership

Ringpop used gossip and consistent hashing so stateful actors — like a trip's live session — could live on a node without a separate ZooKeeper-shaped control plane. The failure mode is a network partition that splits the ring, two nodes own the same key, and you double-dispatch a driver. Mid-size steal: sticky ownership only with a lease in a true coordinator (etcd, database row), or keep the session stateless.

Operational gotcha: gossip that is slow to declare a dead node, so traffic still hashes to a corpse; or too fast, so a GC pause reshuffles the world. Tune with production-like pauses. Another is hot keys: a city-center geohash or a celebrity route still lands on one member. Ringpop does not abolish hotspots. Rolling deploys that take many nodes out at once move a large fraction of keys; drain. Testing gossip locally with two processes will not find split-brain. Use a chaos partition. Uber open-sourced the idea; many teams are better served by Kafka partition assignment or a dispatcher with Redis locks. Steal the actor-per-key idea for in-memory speed, and steal a fencing token so a returning zombie cannot write. Membership protocols are fun until a partition at an airport on New Year's Eve. If you cannot explain your fencing, do not gossip your shard map.

## What you can borrow

- Consistent hashing minimizes reshuffling on membership changes — reach for it whenever you're sharding across a cluster that scales dynamically.
- A centralized coordinator isn't the only way to manage cluster membership; gossip protocols trade a little consistency latency for a lot less centralized load.
- Decide explicitly how much staleness in membership or routing information your application can tolerate — that tradeoff should be a design decision, not an accident.
- Separate the "how do requests get routed" concern from the "who owns what" concern; composing two focused libraries is often more robust than one that does both.
