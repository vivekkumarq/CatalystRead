---
title: "HTTP Caching: Cache-Control, ETags, and CDN Interplay"
slug: "http-caching-cache-control-etags-cdn"
description: "How Cache-Control directives and ETags interact with browser and CDN caches, and where each layer disagrees in ways that cause stale content bugs."
publishedAt: "2026-07-07"
updatedAt: "2026-09-16"
category: "Web Development"
tags:
  - HTTP
  - Caching
  - CDN
  - Web Performance
---

Most "why is the old version still showing" bugs trace back to a cache header nobody set deliberately, or two caching layers disagreeing about who's in charge. Browsers, CDNs, and reverse proxies each maintain their own cache with their own rules, and `Cache-Control` is the one header that's supposed to govern all of them — but only if you use its directives correctly.

## The core directives

```
Cache-Control: public, max-age=31536000, immutable
```

`max-age` sets freshness lifetime in seconds; `public` allows any cache, including shared CDN caches, to store the response; `immutable` tells the browser not to even revalidate on refresh, which matters because browsers otherwise issue a conditional request on hard refresh regardless of `max-age`. This combination is the standard for content-hashed static assets — `app.a3f9c1.js` — where a new deploy produces a new filename, so caching forever is safe by construction.

For anything that can change without a URL change — an HTML document, an API response — `max-age=0` alone isn't enough on its own:

```
Cache-Control: no-cache
```

`no-cache` is misleadingly named — it doesn't forbid caching, it forbids using the cached copy *without revalidating first*. `no-store` is the directive that actually prevents storage entirely, appropriate for responses containing sensitive per-user data.

## ETags: revalidation without re-downloading

An `ETag` is a fingerprint of the response body. On a subsequent request, the browser sends it back in `If-None-Match`, and the server responds `304 Not Modified` with no body if the fingerprint still matches:

```
Request:  If-None-Match: "33a64df551"
Response: HTTP/1.1 304 Not Modified
```

This is what `no-cache` is actually enabling — the cached copy stays around, but every use gets a cheap round trip to confirm it's still current before serving it, instead of a full re-download. Pair it with `Last-Modified` as a fallback for servers or proxies that strip ETags, since some CDN configurations do.

## Where the CDN layer disagrees with the browser

A CDN edge node has its own cache, governed by the same `Cache-Control` header by default, but it can be overridden independently:

```
Cache-Control: public, max-age=60, s-maxage=86400
```

`s-maxage` applies only to shared caches — the CDN edge — and takes precedence over `max-age` there, while browsers ignore it and use `max-age`. This split lets you serve a fast, edge-cached response globally for a day while still forcing each individual browser to revalidate every minute, which is a common pattern for content that changes occasionally but where a slightly stale browser cache is more tolerable than an origin hit on every edge miss.

## The purge gap

Even with `s-maxage` set correctly, updating content before its TTL expires requires an explicit CDN purge — most providers expose this via API or dashboard. Teams that skip building purge into their deploy pipeline end up either setting `max-age` far lower than the content actually needs, sacrificing cache-hit ratio to compensate, or shipping updates that silently don't appear for existing edge caches until the TTL naturally expires. If your deploy process changes content at a stable URL, wiring a purge call into that same pipeline is the fix — not shortening the TTL until the problem becomes invisible rather than solved.

## Vary: the header people forget

If a response differs by `Accept-Encoding`, `Accept-Language`, or an auth-dependent header, `Vary` tells caches to key on that header too — omitting it is how a CDN ends up serving one user's gzip-negotiated or localized response to someone else entirely.

## A worked failure mode

`Cache-Control: public` on HTML with user names. ETags are weak and generated from timestamps so they never match. A CDN ignores `Vary: Cookie` and serves mixed users. The failure is caching personalized responses. Private/no-store for personalized; hashed assets with long cache; CDNs that honor Vary or split caches.

## When this is the wrong tool

HTTP caching is the wrong tool to hide a missing index. ETags are the wrong validator if you can hash content. Do not cache POSTs. Cache immutable bytes aggressively; be conservative on HTML.

Treat the counterexample as part of the spec. Someone will apply "HTTP Caching: Cache-Control, ETags, and CDN Interplay" to a problem that only looks similar at the noun level—same words, different constraints. Require a one-page fit check: scale, consistency, failure domains, and who is on call. If two of those are guesses, run a spike, not a rewrite. The expensive bugs are not the ones in the happy-path tutorial; they are the ones where the tutorial's silent assumptions were load-bearing.
A CDN that ignores `Cache-Control` because a legacy page rule says "cache everything" will outrank your origin headers. Inventory those rules the same week you ship new directives, and test with a logged-in cookie and a logged-out request. If those two responses can ever share a cache key, you have a privacy incident, not a performance win.
