---
title: "The Layers of Caching in a Web Stack"
slug: "layers-of-caching-in-a-web-stack"
description: "Browser, CDN, application, and database caching each solve a different problem and fail differently — knowing which layer to reach for matters."
publishedAt: "2024-12-02"
category: "Performance"
tags:
  - Performance
  - Caching
  - Web Architecture
  - Backend
---

A request to a modern web application can pass through four or five distinct caching layers before it ever reaches a line of application logic, and each of those layers exists to solve a different problem with different failure modes. Treating "add caching" as one decision instead of a choice between layers is how teams end up with a Redis cache in front of data that barely changes and no browser caching on assets that never change at all.

## Browser and CDN: caching what doesn't need your server at all

The cheapest request is the one that never reaches your infrastructure. Browser caching, controlled by `Cache-Control` headers, keeps static assets — JS bundles, images, fonts — on the user's machine entirely, avoiding a network round trip on repeat visits. Content-hashed filenames (`app.a3f9e1.js`) make long, aggressive cache lifetimes safe, because a new deploy produces a new filename rather than requiring the old cached version to be invalidated.

```
Cache-Control: public, max-age=31536000, immutable
```

A CDN extends the same idea to first-time visitors by caching at edge locations close to the user, and it's worth using for more than static assets — API responses that are the same for every user, like a product catalog or public content, are good CDN candidates too, as long as you're deliberate about cache duration versus staleness tolerance.

## Application-level caching: the layer that needs the most care

This is the layer people mean by default when they say "add caching" — an in-memory or Redis-backed cache sitting between application code and a slower data source. It's also the layer with the most ways to go wrong, because unlike browser and CDN caching, it's caching data that changes, which means invalidation is now your problem.

```javascript
async function getUser(id) {
  const cached = await redis.get(`user:${id}`);
  if (cached) return JSON.parse(cached);

  const user = await db.query("SELECT * FROM users WHERE id = $1", [id]);
  await redis.set(`user:${id}`, JSON.stringify(user), "EX", 300);
  return user;
}
```

The failure mode worth designing around from the start is staleness that surprises someone. A five-minute TTL on a user's display name is invisible; a five-minute TTL on their account balance is a support ticket. Pick TTLs based on how bad it is for a specific piece of data to be wrong for that long, not a single default applied uniformly across the whole cache. Cache invalidation on write — explicitly deleting or updating the cache entry when the underlying data changes — is more reliable than relying on TTL expiry alone for anything where staleness is user-visible and annoying.

## Database-level caching: the layer you get partly for free

Databases cache aggressively on their own — query plan caches, buffer pools holding hot pages in memory, and in many systems a query result cache for identical repeated queries. This layer usually doesn't need direct management, but it's worth understanding because it explains a confusing pattern: a query that's slow the first time and fast on every subsequent run isn't necessarily well-optimized, it might just be warm. Benchmarking a query only after running it several times can hide a real performance problem that will resurface after a cache eviction or a database restart.

## Choosing the right layer

The layers compose, but they're not interchangeable substitutes for each other. If your bottleneck is repeated identical requests from many users, CDN caching solves it with the least operational overhead. If it's a slow query behind personalized data, application-level caching is the right tool, but it comes with the invalidation problem attached. If it's a query that's slow even on a warm database cache, no amount of caching upstream fixes that — the query itself, or the schema underneath it, needs attention. Reaching for Redis before ruling out the cheaper layers is a common way to add operational complexity for a problem a `Cache-Control` header would have solved.
