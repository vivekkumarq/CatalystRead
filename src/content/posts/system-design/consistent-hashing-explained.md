---
title: "Consistent Hashing, Explained From First Principles"
slug: "consistent-hashing-explained"
description: "How consistent hashing limits data movement when nodes join or leave, and why virtual nodes are what makes it actually balanced."
publishedAt: "2025-06-19"
updatedAt: "2026-09-12"
category: "System Design"
tags:
  - System Design
  - Distributed Systems
  - Scalability
  - Databases
sources:
  - title: "Consistent Hashing and Random Trees: Distributed Caching Protocols for Relieving Hot Spots on the World Wide Web"
    author: "David Karger, Eric Lehman, Tom Leighton, Matthew Levine, Daniel Lewin, Rina Panigrahy"
    publisher: "STOC 1997"
    url: "https://dl.acm.org/doi/10.1145/258533.258660"
  - title: "Dynamo: Amazon's Highly Available Key-value Store"
    author: "Giuseppe DeCandia et al."
    publisher: "SOSP 2007"
    url: "https://www.allthingsdistributed.com/files/amazon-dynamo-sosp2007.pdf"
---

Naive hash-based sharding — `server = hash(key) % N` — works fine until N changes. Add or remove one node and the modulo shifts for nearly every key, which means nearly every cache entry misses at once and every piece of data needs to move. Consistent hashing exists specifically to make that number small.

## Placing Nodes and Keys on the Same Ring

The idea: hash both nodes and keys onto the same circular space (typically 0 to 2^32 - 1), and assign each key to the first node clockwise from its position.

```text
Ring (0 ---------------------------- 2^32-1, wraps around)

     NodeA(120)      NodeB(4500)         NodeC(9800)
        |               |                    |
   key(80) -> A    key(2000) -> B      key(6000) -> C
```

When `NodeB` is removed, only the keys that were mapped to it move — to `NodeC`, the next node clockwise. Every other key's owner is unchanged. Adding a node back works the same way in reverse: it only steals keys from its immediate clockwise neighbor.

## Virtual Nodes Fix the Uneven-Load Problem

Plain consistent hashing has a real weakness with a small number of physical nodes: their positions on the ring are effectively random, so one node can end up owning a disproportionate arc, and therefore a disproportionate share of traffic.

The fix is virtual nodes: each physical node is hashed into many points on the ring (100 to a few hundred is typical), not one.

```python
class ConsistentHashRing:
    def __init__(self, virtual_nodes=150):
        self.virtual_nodes = virtual_nodes
        self.ring = {}  # hash -> physical node
        self.sorted_hashes = []

    def add_node(self, node):
        for i in range(self.virtual_nodes):
            h = hash(f"{node}:{i}")
            self.ring[h] = node
            bisect.insort(self.sorted_hashes, h)

    def get_node(self, key):
        h = hash(key)
        idx = bisect.bisect(self.sorted_hashes, h) % len(self.sorted_hashes)
        return self.ring[self.sorted_hashes[idx]]
```

More virtual nodes smooth the load distribution closer to uniform, at the cost of more ring metadata to store and search — a tuning knob, not a one-time decision.

## What It's Actually For

Consistent hashing shows up under three recurring names, and it's the same mechanism each time:

| Use case | What's being placed on the ring |
| -------- | -------------------------------- |
| Memcached / Redis client-side sharding | Cache servers, hashed by connection string |
| DynamoDB, Cassandra partitioning | Storage nodes, hashed by token range |
| Load balancer session affinity | Backend servers, hashed by server identity |

The property that matters in each case is the same: node count changes affect *O(keys/N)* of the data, not *O(keys)*. That's the whole pitch — not perfect balance, not zero data movement, just proportional data movement instead of catastrophic reshuffling. If your system already tolerates a full rehash on scaling events (a nightly batch job, a system with a maintenance window), the added complexity of a hash ring may not be worth it. It earns its place specifically when nodes join and leave while the system stays live.

## Where the original papers still matter

Karger et al. introduced consistent hashing in 1997 for web caches: the ring was a way to keep a cache hit rate from collapsing when servers appeared and disappeared. Amazon's Dynamo paper later made virtual nodes (they called them "tokens") the default production story — not because the math changed, but because real clusters are small enough that a handful of physical positions on the ring leave hot shards. Cassandra, Riak, and a generation of client-side memcached libraries inherited that same picture.

Jump hashing and rendezvous hashing (HRW) solve the same "minimal remapping" problem with different data structures. They are worth knowing when you cannot cheaply store a large virtual-node map, or when you need weighted nodes without painting hundreds of extra points on a ring. The interview-friendly ring diagram is still the right mental model; production systems often pick a later variant once the metadata cost shows up.
