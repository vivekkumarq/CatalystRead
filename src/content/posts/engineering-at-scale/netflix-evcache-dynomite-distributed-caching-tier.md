---
title: "EVCache and Dynomite: The Caching Tier Behind Every Netflix Play Button"
slug: "netflix-evcache-dynomite-distributed-caching-tier"
description: "How Netflix wrapped Memcached in EVCache for wide-area replication and built Dynomite to give Redis a Dynamo-style distributed backbone."
publishedAt: "2025-07-14"
updatedAt: "2026-09-16"
category: "Netflix"
tags:
  - Engineering at Scale
  - Netflix
  - Caching
  - Distributed Systems
sources:
  - title: "Netflix Technology Blog"
    publisher: "Netflix"
    url: "https://netflixtechblog.com"
  - title: "Netflix Open Source"
    publisher: "Netflix"
    url: "https://netflix.github.io"
---

Every homepage render, every playback start, every membership check at Netflix depends on data that's too expensive to fetch fresh from a database on every request but too important to serve stale for long. The standard answer is a cache, and the standard tool is Memcached. Netflix's problem wasn't finding a caching layer — it was making one durable and fast across multiple AWS availability zones and regions, for a company that can't tolerate a single zone outage taking its cache tier down with it.

## EVCache: Memcached with a distribution problem solved

EVCache is Netflix's caching solution built on top of unmodified Memcached, with a client library that adds the pieces Memcached doesn't provide out of the box: replication across zones, and later across regions, plus consistent hashing, auto-discovery of cache nodes, and the ability to keep serving reads even when a whole zone's cache nodes disappear. The name stands for "Ephemeral Volatile Cache," and the design goal was explicit — treat cache loss as a normal, expected event, not an incident, because caches are rebuilt from source-of-truth data anyway.

Rather than running a single cache cluster and hoping it survives, EVCache writes to multiple zone-local clusters simultaneously, so a read can always be served from the nearest healthy replica. That replication is asynchronous and best-effort by design; EVCache trades strict consistency for availability and low latency, which is the right trade for the kind of data it typically holds — precomputed personalization results, membership and account lookups, viewing history fragments — where a few seconds of staleness is far cheaper than a slow or failed request.

At Netflix's scale, EVCache handles an enormous volume of read and write operations across thousands of nodes, and it became one of the most heavily used pieces of shared infrastructure in the company's stack precisely because nearly every service benefits from the same pattern: expensive-to-compute, cheap-to-cache, tolerant of eventual consistency.

## Dynomite: giving Redis what Dynamo gave key-value stores

Memcached-based EVCache solves simple key-value caching well, but some Netflix use cases needed data structures Memcached doesn't have — lists, sets, sorted sets — which is Redis's territory. The problem was that Redis, out of the box, is a single-node data structure server without built-in multi-region replication or the operational model Netflix needed. So Netflix built Dynomite, a generic dynamo-style replication layer that sits in front of Redis (and, in principle, other single-node stores) and adds the same kind of sharding, cross-zone and cross-region replication, and high availability that the original Amazon Dynamo paper described, without requiring changes to Redis itself.

Dynomite's approach mirrors the classic Dynamo pattern: consistent hashing to distribute keys across a ring of nodes, configurable replication factors, and tunable consistency so callers can choose the latency-versus-durability trade-off appropriate to their use case. Because it wraps the underlying data store rather than reimplementing it, Dynomite could give Redis Dynamo-style distribution while still benefiting from Redis's own performance and data-structure work upstream.

## Two tools, one philosophy

EVCache and Dynomite solve adjacent but different problems — simple high-throughput caching versus richer data structures with tunable consistency — and Netflix runs both rather than forcing every use case through one. The shared philosophy is what matters: take a well-understood, widely trusted single-node technology, and add the distribution, replication, and failure-tolerance layer as a wrapper rather than a fork or a rewrite. That kept Netflix on stock Memcached and stock Redis internals, benefiting from upstream improvements and community familiarity, while solving the distributed-systems problem as a separate, reusable layer.

## A concrete failure mode for a replicated cache tier

EVCache and Dynomite-style layers wrap memcached/Redis with replication and zone awareness so a cache miss is not a cross-country trip and a node death is not a herd. The failure mode is treating the cache as a network of truth. Once clients write only to the cache, a replication lag becomes a product bug, and a flush becomes data loss. Mid-size steal: replicate the cache for availability, keep the source of truth elsewhere, and make replicas serve stale rather than none.

Operational gotcha: hot keys still exist under consistent hashing. Replication multiplies write traffic for those keys and can saturate NICs. Stampeding a popular title's metadata is still a thing; combine with leases. Another incident is a global invalidation that is implemented as "delete everywhere" at the same instant, recreating a herd toward origin. Invalidate in waves or serve stale-while-revalidate. Dynomite/Redis clusters with large values fragment memory and evict more than you expect; measure evictions per slab or policy, not only used_memory. Client libraries that retry all replicas on timeout can amplify an outage. Steal hedged requests carefully, with a budget. Cross-region cache replication of personalized data also becomes a privacy and residency problem; not every key should fan out to every geography.

## What you can borrow

- Wrap proven single-node technology with a distribution layer instead of forking it or building a replacement from scratch — you keep upstream compatibility and community knowledge.
- Treat cache loss as an expected, tolerable event rather than an incident; design callers to rebuild from source-of-truth data.
- Choose eventual consistency deliberately for data where staleness is cheap and latency is expensive — don't default to strong consistency everywhere.
- Let different access patterns use different underlying stores (key-value versus richer data structures) instead of forcing one technology to do everything.
- Invest in auto-discovery and topology-awareness in your cache client; manual node configuration doesn't survive real operational scale.
