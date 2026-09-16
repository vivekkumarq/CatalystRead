---
title: "Latency Budgets: Allocating Your 200ms"
slug: "latency-budgets-allocating-your-200ms"
description: "A 200ms response time target means nothing until it's broken down into a budget per component — otherwise every team assumes someone else owns it."
publishedAt: "2025-06-28"
updatedAt: "2026-09-16"
category: "Performance"
tags:
  - Performance
  - Latency
  - System Design
  - Architecture
---

"This endpoint should respond in under 200ms" is a target that sounds precise and functions as almost meaningless the moment a request touches more than one service. Without breaking that number down into a budget per component, every team building a piece of the request path assumes there's slack somewhere else, and the sum of everyone's reasonable-looking individual latency adds up to well over budget with nobody having done anything obviously wrong.

## Why a single target isn't enough

A request that hits an API gateway, an auth service, an application server, a database, and a downstream enrichment call has five opportunities for latency to accumulate, and a single end-to-end target doesn't tell any of those five components what their fair share is. The gateway team ships a change that adds 15ms and considers it negligible. The auth team's token validation adds 20ms and also seems fine in isolation. Individually reasonable, collectively the budget is gone before the request has even reached application logic.

A latency budget fixes this by allocating the total explicitly, the same way a financial budget allocates a total spend across departments:

```
Total budget: 200ms
  Network + TLS handshake:     15ms
  Auth/token validation:       20ms
  Application logic:           50ms
  Database query:              60ms
  Downstream enrichment call:  40ms
  Serialization + misc:        15ms
  ------------------------------------
  Total:                      200ms
```

Once this exists as a shared document rather than an implicit assumption, a component that's running over its line item is a concrete, attributable problem instead of an anonymous contributor to a vague overall slowness.

## Allocating the budget honestly

The temptation when building a budget like this is to give every component a generous, comfortable number and end up with a total well over the actual target — which produces a document that feels rigorous but doesn't constrain anything. Work backward from the real target and be honest about which components have hard floors that can't be negotiated down. A database query against a large, actively-written table has a different realistic floor than a lookup against a small, cached reference table, and pretending otherwise just moves the shortfall onto whichever team has the least leverage to push back.

Build in a small reserve, not just a sum of best-case estimates — five to ten percent unallocated for variance, so that ordinary jitter in one component doesn't blow the total budget every time.

## Where budgets actually change decisions

The real value of an explicit budget shows up during design conversations, not during incident response. A proposed downstream call that would add 60ms is easy to wave through when there's no visible constraint; it's a much more focused conversation when the enrichment call's line item is 40ms and the new call would blow it. The budget turns an abstract "let's keep things fast" value into a specific number someone has to either fit inside or explicitly renegotiate, with everyone able to see what else would need to shrink to make room.

It also clarifies where optimization effort is worth spending. A component sitting comfortably under its allocated budget isn't a priority even if it could theoretically be made faster — the 60ms database query at its 60ms budget matters more than shaving 5ms off a component already running at 10ms against a 15ms allocation. Budgets redirect performance work toward the places actually constraining the total, instead of toward whichever component is easiest to profile or most recently touched.

Revisit the allocation periodically rather than treating it as fixed forever — as traffic patterns, data volume, and architecture change, yesterday's realistic per-component floor can become unrealistic, and a budget nobody revisits eventually stops reflecting what's actually achievable.

## A worked failure mode

A 200ms budget is assigned as 50ms each to four services that all retry twice with 100ms timeouts; the product p99 is 800ms. DNS and TLS are forgotten. A mobile 3G user was never in the budget. The failure is budgets that ignore retries, tails, and the network you do not own. Budget p99, include fan-out and retries, and keep a reserve for the client.

## When this is the wrong tool

A 200ms slogan is the wrong tool for a report that can be async. Do not cut a correctness check to meet a made-up number. Budgets help when leadership will drop features that do not fit.

When this pattern is stretched past its assumptions, the first outage looks like a mysterious performance cliff instead of a design limit. "Latency Budgets: Allocating Your 200ms" fails that way when traffic mix, data shape, or team skill does not match the blog that sold the approach. Keep a kill switch: feature flag, smaller blast radius, or an older path that still works. Measure the thing the idea claims to improve, not a vanity graph. If you cannot name a workload where you would refuse to use it, you have not finished the design.
