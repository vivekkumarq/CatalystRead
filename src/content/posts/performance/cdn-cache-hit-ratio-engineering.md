---
title: "CDN Cache Hit Ratio Engineering: The Number That Is Not a Vanity Metric"
slug: "cdn-cache-hit-ratio-engineering"
description: "What 'hit' means, why query strings and cookies destroy it, and how to design cache keys, TTLs, and origin shields on purpose."
publishedAt: "2026-08-21"
category: "Performance"
tags:
  - Performance
  - CDN
  - HTTP
  - Caching
sources:
  - title: "RFC 9111: HTTP Caching"
    publisher: "IETF"
    url: "https://www.rfc-editor.org/rfc/rfc9111"
  - title: "Cache-Control"
    publisher: "MDN"
    url: "https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cache-Control"
---

A CDN **cache hit ratio** is hits / (hits + misses) at the edge (sometimes layered: POP vs regional shield). Product people treat 95% as a grade. Engineers treat it as a function of **cache key**, **TTL**, and **variance**. If every URL is unique (`?session=`), the ratio is near zero and origin dies. If you cache `Set-Cookie` personalized HTML as public, you leak users. The metric is only useful with a defined key.

## Keys are the product

Default keys often include the full query string. A tracking param (`utm_source`) shards the cache. Normalize: ignore known params, sort the rest, or drop query on static assets. `Vary: Accept-Encoding` is correct; `Vary: Cookie` on a page that sets a session cookie is "do not cache." Separate **static** (long TTL, immutable hashed names) from **HTML** (short TTL or cache at the app with surrogate keys).

```text
bad key:  /app.js?cb=Math.random()
good key: /app.7f3a2c.js   Cache-Control: public, max-age=31536000, immutable
```

Cookies on static hosts: don't. Move assets to a cookieless domain or strip cookies at the CDN. Authorization headers usually force miss unless you built a private cache design (signed URLs, not public POPs).

## TTLs, stale, and origin shield

Short TTL + high QPS still helps if **revalidation** is cheap (`ETag`). `stale-while-revalidate` keeps the POP serving while one request goes to origin. An **origin shield** (regional cache) collapses thundering herds. Purging: wildcard purge of `/*` after every deploy is how you DDoS yourself; hashed filenames avoid purge.

Hit ratio by **status** and **path prefix** beats a global average. APIs at `/v1/` might correctly be 10%; `/static/` should be 99%. A blended 70% hides a broken static config.

## Measurement

Use the CDN's analytics, not `curl` once. Compare byte hit ratio versus request hit ratio (large video vs tiny CSS). A miss that 304s is not an origin render.

Read RFC 9111 for `Cache-Control` and `Vary`. Then dump the top 20 miss URLs. If they differ only by junk query params, you do not have a capacity problem. You have a key problem, and the hit ratio is telling the truth.
