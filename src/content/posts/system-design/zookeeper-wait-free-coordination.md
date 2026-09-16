---
title: "ZooKeeper: Wait-Free Coordination for a Distributed System"
slug: "zookeeper-wait-free-coordination"
description: "Hunt, Konar, Junqueira, and Reed's USENIX ATC 2010 paper: a filesystem-shaped API, linearizable writes, and why watches beat homemade leader locks."
publishedAt: "2026-08-15"
category: "System Design"
tags:
  - System Design
  - Distributed Systems
  - Coordination
  - ZooKeeper
sources:
  - title: "ZooKeeper: Wait-free coordination for Internet-scale systems"
    author: "Patrick Hunt, Mahadev Konar, Flavio P. Junqueira, and Benjamin Reed"
    publisher: "USENIX ATC 2010"
    url: "https://www.usenix.org/legacy/event/atc10/tech/full_papers/Hunt.pdf"
  - title: "ZooKeeper documentation: watches"
    publisher: "Apache ZooKeeper"
    url: "https://zookeeper.apache.org/doc/current/zookeeperProgrammers.html"
---

Apache ZooKeeper is easy to dismiss as "that thing Hadoop used for leader election." The USENIX ATC 2010 paper by Hunt, Konar, Junqueira, and Reed is more precise: they built a **wait-free coordination kernel** with a small hierarchical namespace, FIFO client order, and linearizable writes, so application developers would stop inventing broken distributed locks.

Wait-free here is about the client API, not magic latency. A client never waits for other clients to finish a request in order to make progress on its own session. Slow lock holders do not stall unrelated `create` calls. That property is why ZooKeeper could sit under MapReduce, HBase, Kafka's early controllers, and a generation of "ephemeral node means I am alive" services.

## The data model is a filesystem on purpose

Znodes form a tree. Each node has data (usually small), children, and a version. Nodes can be **persistent** or **ephemeral** (deleted when the creating session dies), and **sequential** (the server appends a monotonically increasing suffix). Combine ephemeral and sequential and you have a recipe for locks and barriers without a custom consensus protocol in every app.

Writes go through a leader and are totally ordered. Reads can be served by any replica; they are **timeline consistent** with the client's own writes if you use the sync recipe, but a stale follower can still serve an old child list. Teams that treat every `getData` as linearizable invent split-brain leaders. The paper is explicit: if you need to see the latest write, you either read from the leader or issue a `sync`.

## Watches are one-shot, not a message bus

A **watch** fires once when the watched znode changes, then you must re-register. Missing that fact is the classic bug: you handle an event, forget to set the watch again, and never learn that the lock holder died. Watches are also not a guaranteed delivery queue across partitions; they are a cache-invalidation hint glued to a session.

```text
Client A: create /locks/job-0000000042 ephemeral sequential
Client B: create /locks/job-0000000043 ephemeral sequential
Client B: getChildren /locks + watch
          if 42 is gone, B may enter the critical section
```

The "wait-free" claim matters in this recipe. Client B is not blocked inside the ZooKeeper server waiting for A. B sets a watch and goes to do other work. When A dies, the session expires, the ephemeral node vanishes, and B is notified. Timeouts live in session management, not in a mutex inside the ensemble.

## What belongs in ZooKeeper, and what does not

The paper's performance numbers assume **small znodes** and coordination-rate traffic. Stuffing megabytes of config into a znode, or using the tree as a general pub/sub log, turns the Zab pipeline into your application's bottleneck. Kafka later moved cluster metadata off ZooKeeper for related reasons: a coordination service is the wrong durability story for high-volume records.

Operationally, the ensemble is a majority quorum. Five nodes across failure domains is the usual production shape. Disk latency on the transaction log dominates tail latency. "We added more observers" helps reads, not write quorum. Session expiry that is shorter than a GC pause on clients causes false death and lock storms.

If you are designing a new control plane in 2026, you might pick etcd or a Raft library instead of ZooKeeper. The Hunt et al. paper is still the right mental model: a small, ordered, watched namespace; ephemeral liveness; and an honest split between linearizable writes and cheaper reads. Copy the recipes. Do not copy the "we'll just store the whole world in znodes" phase every cluster goes through at 2 a.m.
