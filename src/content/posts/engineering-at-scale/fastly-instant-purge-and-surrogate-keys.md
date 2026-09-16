---
title: "Instant Purge and Surrogate Keys: Fastly's Answer to 'TTL of 0 or Wait an Hour'"
slug: "fastly-instant-purge-and-surrogate-keys"
description: "How Fastly surrogate keys tag cache objects so a CMS publish can purge a graph of pages in seconds instead of waiting out a long TTL."
publishedAt: "2026-12-23"
updatedAt: "2026-12-23"
category: "Fastly"
tags:
  - Engineering at Scale
  - Fastly
  - CDNs
  - Caching
sources:
  - title: "Purging"
    publisher: "Fastly"
    url: "https://www.fastly.com/documentation/guides/full-site-delivery/purging/"
  - title: "Surrogate keys"
    publisher: "Fastly"
    url: "https://www.fastly.com/documentation/guides/full-site-delivery/caching/working-with-surrogate-keys/"
---

Long TTLs make a CDN cheap and make editors furious. Short TTLs make editors happy and make origin bills and latency worse. Fastly's surrogate key model tags each cached object with one or more keys (article id, template, "all-css") in a `Surrogate-Key` header. A purge API then drops every object in the POP fleet that carries that key, in seconds. Instant purge is the reason you can cache HTML for a long time and still publish. It is also a way to purge the entire site with one mistaken key.

## Keys are a graph

A product page might carry `product-123`, `category-shoes`, `inventory`. A price change purges `product-123`. A sale banner might purge `category-shoes`. Too few keys and you over-purge (hit ratio dies). Too many unique keys and the purge index is huge and you still miss a relationship (the homepage module that embeds the product). Designing keys is data modeling. Soft purge (mark stale, serve while revalidate) is kinder than hard purge for popular URLs.

Purge-all exists and is a panic button. It is also how you DDoS yourself by going to origin worldwide. Ban it for most roles.

## Propagation and consistency

"Instant" is fleet-wide as Fastly implements it, but clients and downstream caches (browsers, other CDNs) still have their own TTLs. `Cache-Control` for browsers should be shorter or use validation; surrogate-control can be longer for the CDN. Mixing them incorrectly means you purged Fastly and Chrome still shows the old article.

Authentication of the purge API is production access. A leaked token is a cache-clearing weapon and a potential origin-melting weapon.

## Failure modes of keyed purge

The concrete failure is a deploy that forgets to emit `Surrogate-Key` on a new template, so purge does nothing and the team "fixes" it with purge-all. Mid-size steal: CI checks that HTML responses include the keys the CMS thinks it owns.

Operational gotcha: a key per user on a "personalized" page that is actually cacheable per user — millions of keys, no sharing, purge of `user-*` is the whole cache. Personalization and surrogate keys fight; use ESI, Compute, or uncached holes. Another is purge bursts on a catalog import (50k products) that serialize into origin storms even with keys if everything is popular. Pace purges or use soft purge plus stale. Race: purge then fetch before the object is gone everywhere; a rare reader gets old, then new, then old. For most CMS this is fine. For legal takedowns, verify. Steal surrogate keys even if you only have Redis: tag entries and drop by tag. Do not invent a TTL of 5 seconds as a substitute for invalidation forever. Measure purge latency and origin QPS after a publish. If origin QPS equals your entire site, the keys were too coarse. Dictionary-based key maps that editors can update without a VCL deploy help, but a dictionary that can list `all` as a key is still a purge-all. Audit who can write dictionaries. Version the key scheme when templates change so leftover keys from last year's CMS do not silently no-op.

## What you can borrow

- Tag cache objects with the domain ids that can invalidate them; purge by tag, not by guessing URLs.
- Keep browser TTL and CDN TTL separate; instant CDN purge does not empty Chrome.
- Forbid purge-all except break-glass, and pace bulk purges.
- Soft-purge popular objects so a publish is not an origin DDoS.
