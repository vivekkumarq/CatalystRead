---
title: "Game Days: How Shopify Rehearses for Its Biggest Traffic Day of the Year"
slug: "shopify-black-friday-game-days-load-testing"
description: "Shopify runs months of scripted load tests and failure drills against production infrastructure to prepare for Black Friday Cyber Monday."
publishedAt: "2025-07-18"
category: "Shopify"
tags:
  - Engineering at Scale
  - Shopify
  - Reliability
  - Load Testing
---

Black Friday Cyber Monday, BFCM, is not a surprise for Shopify — it is a known, dated, unmovable deadline that arrives every year with a traffic curve steeper than almost anything else in commerce. Merchants across the platform see checkout volume multiply within a single weekend, and any capacity miscalculation is visible immediately, in public, on the platform's biggest revenue moment. Shopify's answer has been a recurring discipline of "game days": scheduled, deliberately stressful exercises where engineers throw synthetic and replayed traffic at production-like infrastructure long before the real weekend arrives.

## Rehearsing failure on purpose

A game day at Shopify typically means picking a critical path — checkout, cart, storefront rendering, payment capture — and driving it far past normal load using traffic generation tools that replay realistic request patterns rather than simple flat-rate hammering. The goal isn't just to see whether the system survives; it's to find exactly where it breaks, on a schedule the team controls, with engineers watching dashboards and ready to intervene, rather than discovering the breaking point live during the actual sale. Shopify has talked publicly about running these exercises well ahead of BFCM, sometimes months out, so there's runway to fix what's found and retest.

These exercises deliberately include failure injection: killing database replicas mid-test, saturating a queue, or throttling a downstream dependency to confirm that circuit breakers, retries, and backpressure actually behave as designed rather than as assumed. A load test that only proves the happy path holds under volume misses the more dangerous failure mode, where one degraded dependency cascades into a platform-wide outage during the highest-stakes hours of the year.

## Capacity planning as a year-round habit

Game days feed directly into capacity planning. Shopify's infrastructure teams use results to size pods and clusters — a natural pairing with the platform's pod-based architecture, where isolated shards of merchant traffic can be scaled and tested independently without risking the whole fleet during a bad test. Findings from a game day become concrete tickets: raise a connection pool limit, add a cache layer in front of a hot query, adjust autoscaling thresholds, or renegotiate rate limits with a third-party payment processor ahead of the surge.

Because BFCM traffic is highly predictable in timing but not in exact shape — flash sales from large merchants can spike unpredictably within the weekend — Shopify also builds slack into the plan rather than provisioning for a single point estimate. Game days are run at multiples of the previous year's peak, explicitly trying to stress infrastructure beyond what's expected, so the actual event feels like a rehearsed scenario rather than uncharted territory.

## Closing the loop after the real thing

After BFCM itself, the cycle repeats: real production telemetry from the weekend becomes the new baseline and the next game day's target multiplier, feeding a continuous loop of load testing, fixing weak points, and re-testing throughout the following year. This turns a single scary calendar date into an ordinary, well-worn engineering process rather than an annual fire drill.

## What you can borrow

- Identify your own predictable peak — a seasonal sale, a product launch, an earnings call traffic spike — and schedule deliberate load tests against it well in advance.
- Test failure modes, not just throughput: kill a dependency mid-test to see if your safeguards actually trigger.
- Target a multiple of your expected peak, not the peak itself, to leave margin for surprise.
- Feed real event data back into the next round of tests so load testing compounds year over year instead of resetting.
