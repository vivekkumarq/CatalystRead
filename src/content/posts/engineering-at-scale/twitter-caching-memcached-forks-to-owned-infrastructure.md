---
title: "Caching at Twitter Scale: From Memcached Forks to Owned Infrastructure"
slug: "twitter-caching-memcached-forks-to-owned-infrastructure"
description: "How Twitter outgrew stock Memcached, built Twemcache and the Pelikan framework, and turned caching into deliberately owned infrastructure rather than a commodity."
publishedAt: "2025-07-28"
category: "Twitter"
tags:
  - Engineering at Scale
  - Twitter
  - Caching
  - Performance
---

Caching sits directly in the critical path of almost everything Twitter serves — timelines, social graph lookups, tweet objects — which meant that even small inefficiencies in the caching layer translated into real, aggregate cost and latency at Twitter's request volume. Stock Memcached, the industry-standard caching daemon that Twitter started with like most large web companies, was built for general-purpose use rather than for the specific operational demands of running at Twitter's scale: predictable memory behavior under high churn, low per-connection overhead with enormous connection counts, and visibility into exactly what the cache was doing at any moment. Rather than continuing to run stock Memcached and work around its limitations at the application layer, Twitter invested directly in owning and reshaping its caching infrastructure.

## Twemcache and the memory fragmentation problem

Twitter's first major step was Twemcache, a fork of Memcached tuned for Twitter's specific workload characteristics and operational needs. One recurring pain point with stock Memcached at high scale was memory fragmentation from its slab allocator under Twitter's particular mix of item sizes and churn rates, which could leave a cache instance with plenty of free memory in aggregate but unable to satisfy new allocations efficiently. Twemcache added instrumentation, stats, and operational improvements suited to running thousands of cache instances reliably, treating the kind of visibility an SRE needs — per-instance stats, connection behavior, eviction patterns — as a first-class feature rather than something to infer indirectly.

## Pelikan: rebuilding the cache as a framework

Twitter's caching investment matured further with Pelikan, a framework for building cache servers rather than a single fixed cache implementation. The insight behind Pelikan was that "cache" isn't really one workload — a cache backing a hot, small, read-dominated dataset behaves very differently from one backing a large, write-heavy dataset with short-lived items — and a single monolithic implementation optimized for one pattern inevitably makes compromises for the others. Pelikan provided modular building blocks (storage backends, protocols, eviction policies) that could be assembled into a cache server tuned for a specific workload, including a segment-based storage engine designed to reduce the fragmentation and metadata overhead that had been a persistent issue with slab-based allocators.

```
workload profile --> Pelikan building blocks --> tuned cache server
   (hot/small, write-heavy, TTL-short, etc.)      (storage engine + protocol + eviction policy)
```

## Treating cache infrastructure as a product

The throughline across Twitter's caching evolution is treating caching as owned, first-class infrastructure with its own dedicated engineering investment, rather than a commodity dependency you install and leave alone. That meant building deep operational tooling — dashboards, alerting, capacity models specific to cache behavior — and being willing to fork or rebuild lower layers of the stack when off-the-shelf software's design assumptions stopped matching Twitter's actual traffic patterns. At Twitter's request volume, cache hit rate and eviction behavior directly moved user-facing latency and back-end database load, which made this kind of investment pay for itself in ways that wouldn't be justified at smaller scale.

## What you can borrow

- Don't assume general-purpose infrastructure was tuned for your workload — profile it under your actual traffic before assuming the defaults are fine.
- Memory fragmentation and allocator behavior are easy to overlook until you're running at a scale where they show up as real capacity waste; they're worth understanding before that point, not after.
- "Cache" is not one workload — a system optimized for hot small data and one optimized for high-churn write-heavy data have genuinely different ideal designs.
- Deep operational visibility (per-instance stats, eviction patterns, connection behavior) is what actually lets you run infrastructure well at scale, not just the core serving logic.
