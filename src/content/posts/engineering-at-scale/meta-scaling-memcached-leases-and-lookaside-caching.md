---
title: "Scaling Memcached: How Facebook Made Look-Aside Caching Work at Web Scale"
slug: "meta-scaling-memcached-leases-and-lookaside-caching"
description: "How Facebook turned a simple key-value cache into a cluster of thousands of memcached servers without drowning in stale reads and thundering herds."
publishedAt: "2025-06-01"
category: "Meta"
tags:
  - Engineering at Scale
  - Meta
  - Caching
  - Distributed Systems
---

By the early 2010s, Facebook was running one of the largest memcached deployments in the world — thousands of servers holding trillions of items and serving billions of requests per second. Memcached itself is a simple, single-machine, in-memory key-value store. The interesting engineering wasn't the cache; it was everything Facebook had to build around it to make a fleet of independent caches behave like one coherent, low-latency system in front of a much slower MySQL tier. Much of this was documented in Facebook's 2013 NSDI paper "Scaling Memcache at Facebook."

## The look-aside pattern and its failure modes

Facebook used memcached in a look-aside configuration: application code first checks the cache, and on a miss, reads from the database and populates the cache itself. This keeps memcached simple and general-purpose, but it pushes every failure mode onto the application layer. Two problems stood out at scale. First, thundering herds: when a popular key expired or was invalidated, many web servers could simultaneously miss the cache, hit the database with identical queries, and repopulate the same value. Second, stale sets: a slow database read triggered by an old value could finish after a newer write had already updated the cache, silently overwriting fresh data with stale data.

## Leases as a fix for both problems

Facebook's answer was a lease mechanism built into memcached. When a client misses the cache, memcached hands back a lease token along with the miss instead of just an empty response. Only the client holding the current lease token is allowed to set the value back into the cache; other clients that miss around the same time are told to wait briefly rather than all hammering the database. This collapses a thundering herd of concurrent database reads down to roughly one. Leases also solve the stale-set problem: if a write invalidates the key while a stale read is still in flight, the in-flight read's lease token is invalidated too, so its eventual `set` is silently rejected instead of clobbering newer data.

## Scaling out: pools, regions, and invalidation

A single memcached tier wasn't enough either. Facebook grouped machines into pools by access pattern — some data was small and hot, other data was large and rarely read — so a flood of low-value traffic in one pool couldn't evict valuable items in another. As Facebook expanded to multiple data center regions, they had to decide how cache invalidation should travel between them. The solution routed invalidation through the same replication stream used to propagate database writes: when a write landed in the master region's database, an invalidation for the affected key was piggybacked on the replication feed and applied in follower regions as soon as it arrived, well ahead of the slower database replication itself catching up. This kept read-through caches in remote regions from serving stale data for longer than necessary, without requiring synchronous cross-region cache updates.

## What you can borrow

- A look-aside cache pushes correctness problems (thundering herds, stale writes) onto application code — if you're seeing those problems, the fix usually belongs in the caching layer's protocol, not in more application-level retry logic.
- A lease-like token — "you own the next write for this key" — is a cheap way to collapse concurrent cache-fill requests into one, without needing a distributed lock.
- Segmenting a cache fleet by access pattern (hot vs. cold, small vs. large) prevents one workload from evicting another's data; a single undifferentiated pool assumes all keys deserve equal cache residency, which is rarely true.
- If you replicate data across regions, consider piggybacking cache invalidation on the same stream — it's usually available already and arrives faster than waiting for the full data replication to catch up.
