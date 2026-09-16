---
title: "Caching Strategies Every Backend Engineer Should Know"
slug: "caching-strategies-for-backend-systems"
description: "Cache-aside, read-through, write-through, write-behind — when each pattern fits, and the invalidation trade-offs nobody escapes."
publishedAt: "2026-07-15"
updatedAt: "2026-09-16"
category: "System Design"
tags:
  - System Design
  - Caching
  - Performance
  - Databases
  - Backend Engineering
---

Caching is the highest-leverage performance tool in backend engineering, and also the most reliable source of subtle bugs. The patterns themselves are simple; the judgment is in knowing which failure mode you are choosing to accept.

## Cache-Aside (Lazy Loading)

The application owns the logic: check the cache, miss, load from the database, populate the cache.

```python
def get_product(product_id: str) -> Product:
    cached = cache.get(f"product:{product_id}")
    if cached is not None:
        return Product.from_json(cached)

    product = db.products.find(product_id)
    cache.set(f"product:{product_id}", product.to_json(), ttl=300)
    return product
```

This is the default choice for read-heavy workloads, and for good reasons: only requested data is cached, and a cache outage degrades to slow instead of down. Its costs are the miss penalty (three trips: cache, database, cache) and the staleness window — after a write, the cache serves old data until the TTL expires or you invalidate.

## Read-Through and Write-Through

In read-through caching, the cache *itself* loads from the database on a miss; the application only ever talks to the cache. Write-through completes the symmetry: writes go to the cache, which synchronously persists to the database before acknowledging.

The pair gives you strong consistency between cache and store, at the price of write latency (every write pays for both systems) and cold-start behavior identical to cache-aside. It shines when reads must never see stale data and the caching layer supports it natively.

## Write-Behind (Write-Back)

Write-behind acknowledges the write after updating the cache, then flushes to the database asynchronously — individually, batched, or coalesced.

This produces spectacular write throughput and absorbs spikes beautifully. It also means the cache briefly holds data the database has never seen: a crash at the wrong moment loses acknowledged writes. Use it only where that loss is acceptable (view counters, presence, metrics) or where the queue between cache and store is durable.

## Invalidation: Choose Your Poison

Every strategy above eventually faces the same question — when does cached data stop being served?

- **TTL expiry** is the honest default. Short TTLs bound staleness; they also bound how much load the cache absorbs.
- **Explicit invalidation** (delete on write) minimizes staleness but couples every write path to cache topology, and a missed invalidation is invisible until a user reports it.
- **Event-driven invalidation** (change streams, pub/sub) decouples writers from cache logic, at the cost of new infrastructure and eventual consistency during propagation.

A note on a classic race with cache-aside: *delete-then-write* lets a concurrent reader repopulate the cache with the old value between your delete and your database commit. The common mitigations are short TTLs as a backstop, or versioned keys so stale writes lose harmlessly.

## Stampedes and Hot Keys

When a popular key expires, every request misses at once and the database absorbs the full herd. Defenses, roughly in order of effort:

1. **Jittered TTLs** — spread expirations so keys don't die in unison.
2. **Request coalescing** — one flight populates; the rest wait on it.
3. **Soft TTL / stale-while-revalidate** — serve the stale value while a single background refresh runs.

## A Decision Sketch

| Situation | Reach for |
| --------- | --------- |
| Read-heavy, staleness tolerable | Cache-aside + TTL |
| Reads must match the store | Read/write-through |
| Extreme write volume, loss-tolerant data | Write-behind |
| Popular keys, thundering herds | Coalescing + jitter |

Caching decisions are consistency decisions wearing a performance costume. Name the staleness you can afford *first*, and the right pattern usually picks itself.

## A worked example

Read-through cache: miss loads DB, stores with TTL 60s plus jitter. Write-through on profile updates. Cache key `user:{id}:v2` includes a schema version. Stampede: singleflight / lock per key. You invalidate on write rather than waiting for TTL when the write path is yours.

A metric: hit ratio *and* origin QPS. Hit ratio alone can rise while you serve stale money fields.

## Failure modes

Cache-aside with no TTL and no invalidation. Caching errors (empty 404 forever). Key explosion from unbounded query strings. Redis as a second database of record. Inconsistent TTL vs DB replica lag. Thundering herd without jitter.

Caching personalized HTML with a shared key.

## When this is the wrong tool

If the DB is already in memory and local, a cache layer may add coherence bugs only. Do not cache uncommitted reads. Event-sourced systems may want projections, not a random Redis blob. Full-table scans are not a cache problem. For tiny static config, a process memory map with a watch is enough. CDN for public GET; application cache for private data — do not mix keys.
