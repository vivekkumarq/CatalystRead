---
title: "Fastly VCL: The Edge as a Programmable Cache, Not a Folder of Files"
slug: "fastly-vcl-edge-compute"
description: "How Fastly exposed Varnish Configuration Language so request routing, caching, and synthetic responses could run in POP memory close to the user."
publishedAt: "2026-12-22"
updatedAt: "2026-12-22"
category: "Fastly"
tags:
  - Engineering at Scale
  - Fastly
  - CDNs
  - Edge Computing
sources:
  - title: "VCL"
    publisher: "Fastly"
    url: "https://www.fastly.com/documentation/guides/vcl/"
  - title: "Varnish"
    publisher: "Varnish Software"
    url: "https://varnish-cache.org"
---

Classic CDNs uploaded files or cached GET URLs with a TTL. Fastly's bet was Varnish at the edge: a request hits a POP, VCL decides whether to look up a cache object, whether to pass to origin, how to hash the key, and whether to synthesize a response without a backend. That made the CDN a programmable proxy. Engineers could A/B, geo-route, shield origins, and normalize URLs in the POP rather than in every application. Compute (WASM) later extended what could run; VCL remains the cache-control language a lot of Fastly configurations still are.

## The hash is the product

`vcl_hash` defines the cache key. If you forget a header that changes the response (cookie, accept-language) you serve the wrong page. If you include a noisy cookie, you fragment the cache to dust. Fastly's clustering and clustering-aware hashing try to have one node in the POP own an object. Shielding (a designated inner POP) collapses origin requests so a miss storm does not equal N POPs × origin.

VCL subroutines (`recv`, `miss`, `hit`, `fetch`, `deliver`, `error`) are a state machine. `return(pass)` vs `return(lookup)` is the difference between a personalized API and a cache. Stale-while-revalidate and stale-if-error are first-class because origins die and Fastly would rather serve slightly old than nothing.

## Constraints are the language

VCL is not a general-purpose app server. Time and memory in a request are bounded. That is why it is safe to put on every request at a POP. Teams that try to write a business app in VCL discover the walls: no long loops, careful regex, limited backend logic. Fastly's later Compute products exist for heavier code with different isolation. Mixing them without a clear split (VCL for cache policy, Compute for personalized HTML) creates two sources of routing truth.

## Failure modes of programmable CDNs

The concrete failure is a VCL deploy that hashes on `req.url` including a tracking query string, cache hit ratio collapses, origin melts. Mid-size steal: normalize query strings, and watch hit ratio and origin offload as the deploy's first metrics.

Operational gotcha: `set req.http.Cookie` logic that accidentally passes all authenticated traffic, or worse, caches an authenticated page because you stripped cookies too late. Order of operations in VCL is load-bearing. Another is a synthetic error page that hides origin 5xx so you do not page, and you do not know you are down. Log origin status. Regex that backtracks on a URL will burn CPU across a POP; keep patterns simple. Shield misconfig can send Europe to a US shield and add 80ms to every miss. If you use Fastly, treat VCL like production code: review, test in a service clone, canary a POP if you can. Steal the hash-key design even on CloudFront-style systems: list the variance headers. Do not cache POST. Do not put secrets in VCL comments that are then visible to too many people in the account. Keep origin Host headers and TLS names explicit; a clever VCL that rewrites Host incorrectly will cache one tenant's HTML under another's key. Multi-tenant edges fail that way first.

## What you can borrow

- Make the cache key explicit: vary on what changes the body, ignore what does not.
- Shield origins so a global miss does not become a thundering herd.
- Use stale-if-error; an empty error from the edge is still an outage.
- Review edge config like application code, with hit-ratio as the test.
