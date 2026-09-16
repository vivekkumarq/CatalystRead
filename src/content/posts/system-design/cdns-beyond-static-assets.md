---
title: "CDNs Are More Than Static Asset Caches"
slug: "cdns-beyond-static-assets"
description: "CDNs now run edge compute, cache dynamic responses, and shield origin from thundering herds — far more than a cache for static files."
publishedAt: "2025-07-24"
updatedAt: "2026-09-16"
category: "System Design"
tags:
  - System Design
  - Networking
  - Performance
  - Cloud Infrastructure
---

CDNs earned their reputation caching JPEGs and JS bundles close to users, and plenty of teams still think of them as exactly that — a cache in front of a bucket of static files. Modern CDNs run actual compute at the edge, and treating them only as a cache leaves a lot of latency reduction and origin protection on the table.

## Caching Dynamic and API Responses

Static-asset caching works because the response never changes for a given URL. Dynamic responses can still be cached, just with tighter, more deliberate rules — a product listing API that changes every few minutes is a legitimate cache candidate with a short TTL plus explicit invalidation on write, not "no cache" by default.

```text
Cache-Control: public, max-age=30, stale-while-revalidate=120
```

`stale-while-revalidate` in particular is underused: it serves the cached, slightly stale response immediately while kicking off a background refresh, so users never wait on the slow path even for content that changes.

## Edge Compute

Most major CDNs now run actual code at edge locations — Cloudflare Workers, Lambda@Edge, Fastly Compute — which turns the CDN into the first hop of application logic, not just a cache in front of it. Common uses:

- **A/B test bucketing and feature flag evaluation** at the edge, before a request ever reaches origin, so experiments don't add an origin round trip.
- **Auth token validation** — reject malformed or expired requests at the edge, so origin servers never see traffic that was always going to be rejected.
- **Request/response transformation** — rewrite headers, redirect based on geography or device, without an origin deploy.

```javascript
// Edge worker: reject unauthenticated requests before origin sees them
addEventListener('fetch', event => {
  const token = event.request.headers.get('Authorization');
  if (!isValidToken(token)) {
    event.respondWith(new Response('Unauthorized', { status: 401 }));
    return;
  }
  event.respondWith(fetch(event.request));
});
```

## Origin Shielding

A CDN with many edge nodes can accidentally make origin load *worse*, not better, if every edge location independently misses cache and hits origin on a cold key — a hundred edges, a hundred simultaneous origin requests for the same uncached object. Origin shielding designates one edge location, typically nearest origin, as a mandatory intermediate cache layer: every edge location's miss goes through the shield first, which deduplicates concurrent misses into a single origin request. This is the CDN-scale version of request coalescing, and it's the difference between a CDN that protects origin during a traffic spike and one that amplifies it.

## Security as a Side Effect of Position

Sitting in front of every request gives a CDN a natural vantage point for DDoS absorption, WAF rules, and bot filtering — capacity and detection logic that would be expensive to build at origin scale is often included or cheap at the CDN layer, because the CDN is already positioned to see aggregate traffic patterns across many customers.

## The Reframe

Treat the CDN as a layer of the architecture, not an afterthought bolted onto asset URLs: what should be cached and for how long, what can be decided at the edge instead of at origin, and what protection origin gets for free just by not being directly exposed. Teams that only ever configure it for `/static/*` are paying for a CDN and using a fraction of it.

## A worked example

HTML for a news article cached at the edge with `s-maxage=60`, `stale-while-revalidate=600`, Vary on `Accept-Encoding` only. An API GET `/public/prices` cached 5s at the edge with a cache key that excludes cookies. A purge API on publish. TLS and WAF at the CDN. You log cache status headers (`HIT`/`MISS`) in RUM.

Authenticated HTML is not cached, or is cached with a key that includes a hashed session group you actually understand.

## Failure modes

Caching `Set-Cookie`. Cache key too coarse (personalized pages). Cache key too fine (every query string) → origin still melts. Purging by URL but forgetting encoded variants. `no-store` on everything "to be safe." Stale error pages cached for hours.

A CDN that buffers SSE/WebSockets and breaks them.

## When this is the wrong tool

Private dashboards with per-user JSON: origin + app cache, or don't. CDNs are the wrong tool to hide a 2s origin if every request is unique. Do not use a CDN as a database. POSTs are not cacheable in the useful sense. If you need strong consistency of stock counts, do not serve them from a 60s edge cache without a disclaimer or a live overlay.

## A worked failure mode

HTML with `Set-Cookie` is cached at the edge; users share sessions. A purge API is unused after a bad deploy. Origin shielding is off and a miss storm kills origin. The failure is caching personalized content and no purge drill. Cache public bytes, vary correctly, and practice purge.

A CDN is the wrong tool for a private API with no cacheability. It will not fix a 2s origin. Use it for cacheable, purgeable content and DDoS absorption.

When this pattern is stretched past its assumptions, the first outage looks like a mysterious performance cliff instead of a design limit. "CDNs Are More Than Static Asset Caches" fails that way when traffic mix, data shape, or team skill does not match the blog that sold the approach. Keep a kill switch: feature flag, smaller blast radius, or an older path that still works. Measure the thing the idea claims to improve, not a vanity graph. If you cannot name a workload where you would refuse to use it, you have not finished the design.
