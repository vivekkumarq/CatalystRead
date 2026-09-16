---
title: "Rate Limiters and Load Shedders: How Stripe's API Protects Itself"
slug: "stripe-rate-limiters-and-load-shedders"
description: "How Stripe layers per-request rate limiting with system-wide load shedding to keep its payments API available when traffic spikes or dependencies slow down."
publishedAt: "2025-11-09"
updatedAt: "2026-09-16"
category: "Stripe"
tags:
  - Engineering at Scale
  - Stripe
  - Reliability
  - API Design
---

A payments API can't simply go down when traffic spikes — a checkout failure during a flash sale or a major retailer's promotional event is a business-critical outage for Stripe's customers, not an inconvenience. Stripe has written publicly about the layered defenses it built to keep the API responsive under both expected surges and unexpected failures: rate limiting that protects individual users of the API from each other, and load shedding that protects the whole system from being overwhelmed regardless of where the load originates.

## Rate limiting protects fairness, not just capacity

Stripe's rate limiters operate per API key, using token-bucket-style algorithms that allow short bursts while enforcing a steady-state cap over time. The goal isn't purely to cap total throughput — it's to stop one integration's bug or traffic spike (a runaway retry loop, a misconfigured batch job) from degrading the API for every other user sharing the same infrastructure. Because different endpoints have very different costs — reading an object is cheap, creating a charge touches more downstream systems — Stripe applies different limits to different classes of operation rather than one blanket number, so a low-cost read-heavy integration isn't penalized by limits sized for the most expensive write operations.

## Load shedding as the last line of defense

Rate limiting handles the case where you know which caller is misbehaving. Load shedding handles the case where the whole system is under stress and the cause could be anything — a downstream dependency slowing down, a spike that's spread evenly across many legitimate callers, or a bad deploy. Stripe's load shedders monitor system-level health signals, like queue depth and request latency, and start rejecting or degrading requests before the system reaches full saturation and every request starts failing or timing out. A key design choice is shedding load with cheap, fast rejections rather than letting requests queue up and eventually time out — a fast, explicit rejection is far less costly to both the caller and the system than a slow failure, because it frees up resources immediately rather than holding them for the duration of a doomed request.

## Prioritizing what matters most

Not all requests are equal even under duress. Stripe's public writing has described favoring writes that affect money movement — creating a charge, capturing a payment — over less urgent reads when the system needs to shed load, on the theory that a merchant failing to charge a customer is a worse outcome than a delayed dashboard query. This kind of prioritization only works if it's decided in advance, encoded into the shedding logic, and tested — deciding priority order in the middle of an incident is too late.

## What a mid-size team can steal from Stripe's shedding

Rate limits protect shared APIs from a buggy integration; load shedders protect the site from overload by dropping the least valuable work. Mid-size steal both, and do not confuse them. A 429 to a noisy client is not the same as dropping search to save checkout. Put the money path in a class that sheds last.

The concrete failure mode is a global RPS cap that lets one tenant consume it, 429ing everyone else. Key limits by API key and by IP, with a burst. Operational gotcha: load tests that never send 429s, so clients have no backoff and a real limit becomes an outage. Publish Retry-After and test it. Another is shedding that returns 200 with empty bodies, which clients cache as truth. Use honest status codes. Stripe-scale fairness is complicated; you can start with token buckets in Redis and a middleware. Coordinated shedding across pods needs a shared signal or you will flap. Prefer local limits plus an edge limit. Document the numbers in the public API, or partners will guess and then blog that you are down. If your shedder has never fired in production, you do not know if it works. Trip it in a game day on a non-critical endpoint first.

## What you can borrow

- Separate "protect the system from one bad actor" (rate limiting) from "protect the system from being overwhelmed regardless of cause" (load shedding) — they solve different problems and need different signals to trigger on.
- Size limits per operation cost, not uniformly — a single rate limit number applied to both cheap reads and expensive writes either starves the cheap path or under-protects the expensive one.
- Reject fast when you must shed load. A quick, explicit error is cheaper for everyone than a request that queues and eventually times out anyway.
- Decide which request types matter most under stress before an incident happens, and encode that priority into your shedding logic — improvising priority order during an outage is a bad time to start.
