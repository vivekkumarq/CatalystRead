---
title: "Edge Computing and Edge Functions: What They're Actually Good For"
slug: "edge-computing-and-edge-functions"
description: "Edge functions promise lower latency by running closer to users, but they come with real constraints on runtime and state. Here's where they genuinely help."
publishedAt: "2025-12-01"
updatedAt: "2026-09-16"
category: "Cloud"
tags:
  - Edge Computing
  - Cloud
  - Serverless
  - Performance
trending: true
---

Edge computing gets pitched as a blanket latency win — run your code closer to the user, everything gets faster — but the reality is narrower and more interesting. Edge functions run in a genuinely constrained environment compared to a regional server, and the workloads that benefit meaningfully from that proximity are a specific subset, not "any backend logic you currently run centrally."

## Why proximity matters for some things and not others

Network latency between a user and a server is dominated by physical distance and the number of round trips required. A single edge function that terminates a request in 20ms from a point of presence 15ms away from the user genuinely beats a regional server 150ms away — but only if the work being done doesn't itself require a round trip back to a centralized database or origin server, which erases most of the latency gain the edge location provided in the first place.

```javascript
// Genuinely edge-appropriate: no origin round trip needed
export default {
  async fetch(request) {
    const country = request.cf?.country;
    if (country === 'IN') {
      return Response.redirect('https://example.com/in', 302);
    }
    return fetch(request);
  },
};
```

Geolocation-based routing, A/B test bucket assignment, request header manipulation, and static asset personalization are strong fits precisely because they need no data beyond what's in the request itself.

## Where edge functions hit real constraints

Most edge runtimes (Cloudflare Workers, Vercel Edge Functions, Lambda@Edge) intentionally don't run a full Node.js environment — they use a V8 isolate or a similarly constrained runtime, without filesystem access, with strict CPU time limits, and often without full compatibility for npm packages that assume a Node environment:

```javascript
// This fails in most edge runtimes — no filesystem access
import fs from 'fs';
const config = fs.readFileSync('./config.json'); // throws
```

Database queries from the edge are the more consequential constraint: a traditional connection-pooled Postgres connection doesn't work well from thousands of geographically distributed, short-lived edge invocations, which is why edge-compatible data access typically routes through an HTTP-based driver or a globally distributed database designed for exactly this access pattern.

```javascript
// Edge-compatible: HTTP-based driver instead of a raw TCP connection pool
import { neon } from '@neondatabase/serverless';
const sql = neon(process.env.DATABASE_URL);
const rows = await sql`SELECT * FROM products WHERE id = ${productId}`;
```

## Caching at the edge versus computing at the edge

A lot of what looks like "edge computing" wins is actually edge caching — serving a previously computed response from a point of presence near the user, which is a much older and better-understood technique than running arbitrary logic at the edge:

```
Cache-Control: public, s-maxage=3600, stale-while-revalidate=86400
```

`stale-while-revalidate` lets the edge serve a stale cached response instantly while asynchronously fetching a fresh one in the background, which for content that doesn't need to be perfectly fresh on every request often delivers a better latency win than moving compute to the edge at all, with none of the runtime constraints.

## Matching the workload to the model

Edge functions earn their complexity for latency-sensitive, stateless, request-scoped logic — auth token validation, header-based routing, lightweight personalization, image transformation. They're a poor fit for anything requiring heavy computation, a large in-memory model, or frequent round trips to a centralized data store, where the constrained runtime and per-invocation cold start work against the very latency goal that motivated moving to the edge in the first place. The right mental model isn't "move everything to the edge" — it's "identify the narrow slice of logic that's genuinely request-local, and leave everything else where centralized infrastructure already does it well."

## A worked failure mode

A team moves session auth to an edge function to "be fast." The function calls the origin database on every request because the session store was never replicated. p99 is worse than regional compute, and a region-specific bug logs users out only in APAC. Another edge rewrite caches HTML with a `Set-Cookie` and serves mixed personalization. The failure is putting logic at the edge without putting the data it needs there, or caching what must not be cached. Edge is for cacheable, partitionable work with a clear consistency story.

## When this is the wrong tool

Edge functions are the wrong tool for long-running jobs, heavy CPU, and anything that needs a sticky connection to a single VM. They are the wrong place for a monolith's business rules. Do not use the edge to hide an origin that cannot scale. A single region plus a CDN for static assets is enough for many products. Use the edge for latency-sensitive, mostly-stateless decisions and cache hits.
If a dry-run in staging with production-like volume does not reproduce the benefit, do not scale the idea on a hope and a dashboard. Ship the smaller version that you can revert in one deploy.
