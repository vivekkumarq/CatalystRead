---
title: "The Caching Tier That Keeps Pinterest Fast"
slug: "pinterest-memcache-caching-tier-invalidation"
description: "Behind Pinterest's sharded MySQL fleet sits a heavy memcache layer, and the real engineering challenge was never caching reads — it was invalidating them correctly."
publishedAt: "2025-11-03"
updatedAt: "2026-09-16"
category: "Pinterest"
tags:
  - Engineering at Scale
  - Pinterest
  - Caching
  - MySQL
sources:
  - title: "Pinterest Engineering Blog"
    publisher: "Pinterest"
    url: "https://medium.com/pinterest-engineering"
---

Pinterest's product is overwhelmingly read-heavy: for every pin saved, there are countless requests to render feeds, boards, and related-pins modules that read that pin's data back out. Serving that read volume directly from Pinterest's sharded MySQL fleet would require far more database capacity than the company could reasonably run, so a large memcache layer sits in front of the databases, absorbing the vast majority of reads and letting MySQL handle writes and the cache misses that fall through. The caching itself is the easy part of this story. The genuinely hard part, the one that produces real production incidents when it's wrong, is keeping that cache correctly in sync with data that's constantly changing underneath it.

## Look-aside caching as the default pattern

Pinterest's caching tier largely follows a look-aside pattern: a service checks the cache first for a given key, and on a miss, reads from MySQL and populates the cache with that result before returning it to the caller. This is simple to reason about and keeps the cache populated with actually-requested data rather than everything that could theoretically be cached, but it pushes all the correctness burden onto the invalidation side — the cache only stays useful if entries get cleared or updated promptly whenever the underlying row changes, and a stale cache entry doesn't fail loudly, it just quietly serves wrong data until something notices.

```text
Read: check cache -> hit: return cached value
                   -> miss: read MySQL -> populate cache -> return
Write: update MySQL -> invalidate (or update) the corresponding cache key
```

## Why invalidation is the hard problem

Every write path that touches cached data has to also correctly invalidate or update every cache entry that read data derived from what it just changed, and at Pinterest's scale, a single write can have several downstream cached representations — a pin's own cached record, but also cached lists and counts that include it, like a board's pin count or a feed module that embedded that pin's data. Missing even one of those invalidation paths produces a cache entry that silently drifts from the source of truth, and because reads keep succeeding — just with stale data — these bugs tend to surface as confusing user reports rather than clean failures, making them considerably harder to track down than an outright cache outage.

## Guarding against cache stampedes

A cache layer that's mostly effective can still cause serious trouble at the moment it isn't: if a popular key expires or gets invalidated and a large volume of concurrent requests all miss at once, they can all fall through to MySQL simultaneously and hammer a database that was sized assuming the cache would absorb the bulk of that traffic — a classic cache stampede. Pinterest's caching infrastructure has to account for this failure mode directly, through techniques like brief request coalescing on a miss (so concurrent requests for the same key don't all independently hit the database) and careful attention to which keys are popular enough that their invalidation needs special handling rather than treating every key as equally low-risk to invalidate.

## Partitioning and routing at memcache scale

Running memcache at Pinterest's scale also means the cache itself is sharded across many servers, with a routing layer determining which server holds a given key, and that routing layer has to handle server failures and pool changes without causing a wholesale cache-miss stampede of its own. A well-designed caching tier treats the cache cluster's own availability as something to engineer around carefully, not something assumed to always just work.

## A concrete failure mode for pin-shaped caches

Pinterest's memcache tier sits in front of a read-heavy discovery product: boards, pins, and homefeed fragments. Invalidation is the hard part. A pin edit must bust a pin object, board previews, search snippets, and maybe a recommendation feature, or users see the old image forever. Mid-size steal: a list of derived keys per mutation, generated in one library, not ad-hoc deletes in five endpoints.

The failure mode is TTL-only caches on user-edited content. Five minutes of wrong price or wrong alt text is a support queue. Another is over-invalidation: deleting a huge prefix on every save, which is a self-inflicted thundering herd. Version the object in the key when the writer can afford it. Operational gotcha: multi-layer cache (CDN, edge, memcache, local) with different TTLs; a fix appears to work in the app and fails in the image CDN. Document the order of busts. Hot keys for viral pins need replica fan-out or request coalescing. Never cache authorization decisions next to public pin JSON without including the viewer in the key. Pinterest-like products leak private boards that way. Measure stale-view complaints as a reliability metric. If you cannot explain, for a given write, which keys die, you do not have a cache, you have a rumor with RAM.

## What you can borrow

- Look-aside caching is simple, but budget real engineering effort for invalidation correctness, not just cache population — that's where the actual bugs live.
- Enumerate every cached representation a single write can affect (the object itself, counts, lists it appears in) before assuming your invalidation logic is complete.
- Protect popular keys against cache stampedes with request coalescing or similar techniques; don't assume your database can absorb a sudden flood of concurrent misses.
- Treat stale-cache bugs as a distinct failure category from cache-miss failures — they fail silently and need different detection strategies.
- Design your cache cluster's own routing and failover to avoid turning a single server's failure into a stampede against your primary datastore.
