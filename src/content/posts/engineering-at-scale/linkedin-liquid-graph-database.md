---
title: "LIquid: The Graph Database Behind 'How You're Connected'"
slug: "linkedin-liquid-graph-database"
description: "How LinkedIn built LIquid, an in-memory distributed graph engine, to answer connection-degree and shortest-path queries over its member network in real time."
publishedAt: "2026-01-20"
updatedAt: "2026-09-16"
category: "LinkedIn"
tags:
  - Engineering at Scale
  - LinkedIn
  - Graph Databases
  - Distributed Systems
sources:
  - title: "LinkedIn Engineering Blog"
    publisher: "LinkedIn"
    url: "https://engineering.linkedin.com"
---

LinkedIn's entire premise as a product rests on a graph: members, connections, companies, schools, and the edges between them. Features like showing whether someone is a 1st, 2nd, or 3rd-degree connection, finding a path of introductions to reach someone, or powering "People You May Know" all require traversing that graph, often multiple hops deep, in the time it takes a page to load. A relational database, even a well-indexed one, is a poor fit for this: a multi-hop connection query translates into a chain of joins that gets prohibitively expensive as the hop count grows, and the graph itself — hundreds of millions of members and their relationships — is far too large and too frequently updated to treat as a batch-computed artifact refreshed occasionally. LinkedIn built an internal distributed graph engine, referred to internally as LIquid, specifically to serve these traversal queries online, with fresh data, at the latency a live product page demands.

## Keeping the graph in memory, sharded across a cluster

LIquid's core design decision was to keep the graph resident in memory rather than treating disk as the primary access path, because graph traversal patterns are dominated by random access to whatever node a hop happens to land on — exactly the access pattern that punishes disk-backed storage. To handle a graph too large for a single machine, LIquid partitioned members across a cluster of nodes, each holding an in-memory shard of the overall graph along with the adjacency information needed to answer traversal queries touching that shard.

A multi-hop query — like computing connection degree or finding a path between two members — typically needs to fan out across shards as the traversal crosses partition boundaries, since a member's connections are rarely confined to a single shard. LIquid's query execution handled this fan-out internally, coordinating partial traversals across nodes and merging results, so that the complexity of a distributed, multi-hop breadth-first search was hidden behind a query interface that looked like a single logical graph to the caller.

## Staying fresh as the graph constantly changes

Unlike a graph computed periodically in Hadoop for offline analysis, LIquid needed to reflect new connections, profile updates, and other graph mutations close to real time, since a member expects a brand-new connection to be reflected the next time they check someone's degree. This meant LIquid's ingestion path had to apply a continuous stream of graph mutations into the in-memory structure without requiring a full rebuild, consistent with the broader LinkedIn pattern of using a change stream to keep a specialized serving store current rather than periodically recomputing it wholesale.

```
member/connection updates --> mutation stream --> in-memory graph shards
                                                         |
                                          multi-hop query --> fan-out across shards --> merge --> result
```

## What a mid-size team can steal from an in-memory graph

LIquid existed because degree and shortest-path queries over a professional graph do not fit a generic relational join if they must complete while a page loads. Most companies do not need a custom in-memory graph engine. They do need an honest split between the system of record and the structure that answers "are these two people close?" A mid-size steal is a periodically rebuilt adjacency snapshot in Redis, RocksDB, or even a sharded SQL pair table, with a strict SLA: if the snapshot is stale beyond N minutes, the product degrades to "connect" without path explanations rather than blocking the request.

The failure mode is treating the graph engine as writable truth. Product teams start issuing mutations against the in-memory copy because it is fast, then a restart or rebalance loses an edge that never landed in the system of record. Another gotcha is supernodes: recruiters, celebrities, and company pages with millions of edges blow up BFS unless you cap expansion, sample, or precompute. Random-walk and degree features for recommendations have the same hotspot. Steal the query budget idea — hop limits, timeouts, and a fallback — before you steal distributed shared memory. Graph features also leak privacy if hop-2 results include people who opted out of being found; authorization has to sit inside the traversal, not as a filter after you already fetched the path.

## What you can borrow

- When your access pattern is dominated by random, multi-hop traversal, an in-memory graph-native structure will usually beat trying to force the same queries through relational joins, even well-indexed ones.
- Sharding a graph forces you to design for cross-shard fan-out from day one — don't assume queries will stay conveniently local to a single partition as the dataset grows.
- Keep specialized serving stores fresh with a continuous mutation stream rather than periodic full rebuilds, especially when users notice staleness immediately (a just-added connection that doesn't show up yet).
- Hide distributed query complexity (fan-out, partial results, merging) behind a single logical interface so calling code doesn't need to know how the data is partitioned.
