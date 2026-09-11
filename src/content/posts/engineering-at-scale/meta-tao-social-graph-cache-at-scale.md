---
title: "TAO: Facebook's Graph-Aware Cache for Billions of Reads"
slug: "meta-tao-social-graph-cache-at-scale"
description: "Why generic memcache stopped fitting Facebook's social graph, and how TAO's objects-and-associations model became the read path for billions of requests."
publishedAt: "2025-08-12"
category: "Meta"
tags:
  - Engineering at Scale
  - Meta
  - Caching
  - Databases
sources:
  - title: "TAO: Facebook's Distributed Data Store for the Social Graph"
    author: "Nathan Bronson et al."
    publisher: "USENIX ATC 2013"
    url: "https://research.facebook.com"
---

Facebook's social graph — people, posts, comments, likes, friendships — has always been read far more often than it's written. A single post might be read thousands of times for every time it's created, and a friendship is checked constantly but changes rarely. Facebook's early architecture handled this the standard way: MySQL as the source of truth, memcache in front of it to absorb read traffic. That worked for years, but as the graph grew, the mismatch between memcache's generic key-value model and the actual shape of graph data started to show.

## Where generic caching broke down

Memcache doesn't know anything about objects or relationships — it just stores keys and values. Modeling a graph (nodes and the typed, directional edges between them, like "user A likes post B" or "user A is friends with user C") on top of a generic key-value cache pushed a lot of complexity into application code: cache invalidation logic scattered across services, races between a write and a stale read slipping through, and thundering-herd problems when a popular object's cache entry expired and many requests hit the database simultaneously to refill it. None of this was a memcache bug — it was a data-model mismatch, and it got more painful as the graph and read volume scaled.

## Building a cache that understands the graph

Facebook's response, described in the 2013 USENIX ATC paper "TAO: Facebook's Distributed Data Store for the Social Graph," was to build a caching layer with the graph's actual shape baked in: Objects (nodes, like a user or a post) and Associations (typed, directional, time-ordered edges between them, like "authored" or "likes"). Instead of exposing raw get/set commands, TAO exposes an API shaped around these concepts — fetch an object, query associations of a given type, get a time-ordered range of associations — so application code stops reinventing graph semantics on top of a plain cache.

## Tiered, region-aware architecture

TAO's caching layer is tiered: a leader cache tier sits closest to the persistent MySQL storage and handles writes and cache misses, while follower tiers sit closer to application servers and serve the bulk of read traffic, refreshed from the leader tier. This gives read-after-write consistency within a region — if you post a comment, you'll see it immediately — while allowing asynchronous replication across regions, which means a like count or comment might be briefly stale for a user on the other side of the world. That's a deliberate tradeoff: for most social-graph reads, availability and low latency matter more than perfect global consistency at every instant.

## What you can borrow

- When a generic cache's data model doesn't match your domain, a thin domain-aware caching layer can remove a large class of invalidation bugs that would otherwise live scattered across application code.
- Separate the tier that talks to your source of truth (handles writes, misses) from the tiers that serve the bulk of reads, and let reads fan out from there.
- Decide explicitly which parts of your system need strict consistency (a user seeing their own write) versus which can tolerate brief staleness (a like count visible to others) — treating everything as strict is expensive and usually unnecessary.
- Model your cache's API around your domain's actual operations, not around generic get/set primitives, once you understand your access patterns well enough to justify it.
