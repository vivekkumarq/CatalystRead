---
title: "Chord: Scalable Lookup in a Circular Key Space"
slug: "chord-scalable-lookup-protocol"
description: "Stoica, Morris, Karger, Kaashoek, and Balakrishnan, SIGCOMM 2001: successor pointers, finger tables, and the DHT ring everyone still draws."
publishedAt: "2026-08-01"
category: "System Design"
tags:
  - System Design
  - DHT
  - Peer-to-Peer
  - Consistent Hashing
sources:
  - title: "Chord: A Scalable Peer-to-peer Lookup Service for Internet Applications"
    author: "Ion Stoica, Robert Morris, David Karger, M. Frans Kaashoek, Hari Balakrishnan"
    publisher: "SIGCOMM 2001"
    url: "https://pdos.csail.mit.edu/papers/chord:sigcomm01/chord_sigcomm.pdf"
  - title: "Consistent Hashing and Random Trees"
    author: "David Karger et al."
    publisher: "STOC 1997"
    url: "https://www.cs.princeton.edu/courses/archive/fall09/cos518/papers/karger-consistent-hash.pdf"
---

The Chord paper (Stoica et al., SIGCOMM 2001) is the diagram on every DHT slide: keys and nodes on a circle, each key stored at its **successor**, lookups that jump exponentially closer. It took consistent hashing (Karger et al.) and turned it into a routing protocol that needed only `O(log n)` pointers per node and `O(log n)` hops per lookup, with high probability, under uniform hashing.

## Successor is correctness; fingers are speed

Every node knows its successor (and typically a successor list for fault tolerance). That is enough to look up any key by walking the ring — and enough to be unusably slow at internet scale. A **finger table** stores the node at distance `2^i` around the identifier space. A lookup for key `k` asks the farthest finger that does not overshoot `k`, then repeats. Each hop at least halves (in identifier space) the remaining distance.

```text
node 8 fingers: 8+1 → 14, 8+2 → 14, 8+4 → 21, 8+8 → 32, ...
lookup key 30: jump toward 32, then walk back via successors
```

Joins and leaves stabilize by notifying successors and refreshing fingers. The paper's stabilization protocol is easy to get slightly wrong: a naive join can create a ring with a discontinuity, after which lookups loop or drop keys. Production DHTs spend as much code on churn as on the happy-path hop count.

## What Chord assumed, and what operators hit

Identifiers are SHA-1 of IPs or random bits. If ids cluster, load and hop count suffer. **Virtual nodes** spread a physical host around the ring, the same trick Dynamo later used for capacity. Chord stores a key at one successor; replication is extra successors. The lookup finds a node, not a blob with a CAP story. Put/get consistency is whatever you layer on top.

Compared with Kademlia, Chord's sequential finger chase is more sensitive to RTT. Compared with a centralized index, Chord has no single tracker — and no simple answer to malicious nodes advertising false successors. The SIGCOMM paper is a systems result about scalable lookup, not a complete security architecture.

## Why you still need this paper

Every "we shard by hash(key) % N" conversation is Chord with the routing removed. When N changes, modulo hashing moves most keys; consistent hashing / Chord's ring moves a fraction. Cassandra tokens, Dynamo partitions, and Kubernetes ring hashers are cousins. When someone proposes a peer-to-peer service discovery without a control plane, they are proposing a DHT, and Chord is the simplest specification of the ring invariant: **the successor of k is the live node with the smallest id ≥ k (mod 2^m)**.

If you implement a ring, test join/leave while lookups run. Test a successor crash with the successor list. Test wraparound at id 0. The paper's theorems assume eventual stabilization; your unit tests should not.

Use Chord's math when you need decentralized lookup with modest state. Use a coordination service when you have a membership list of size 12 and a product requirement for linearizable metadata. Drawing a circle on a whiteboard is not a design. Naming successor, finger, and stabilize is.
