---
title: "RUM versus Synthetic Monitoring: Two Clocks for the Same User Promise"
slug: "rum-vs-synthetic-monitoring"
description: "What real-user monitoring actually samples, why synthetics still catch the outage in a region with no traffic, and how to budget both without two sources of truth."
publishedAt: "2026-08-27"
category: "Performance"
tags:
  - Performance
  - Observability
  - Web Development
  - SLOs
---

Synthetic monitoring hits your URLs from a datacenter on a schedule. Real-user monitoring (RUM) records timings from browsers and apps that already showed up. They disagree constantly, and that is useful if you know why. They become a war if a VP picks the prettier graph.

## Synthetics are a unit test for "is it up from here"

A probe in Virginia fetching `/health` or rendering `/checkout` every minute will notice a certificate expiry, a DNS miss, and a region that is empty of customers at 3am. It will not notice that Android Chrome on a slow radio in another country cannot complete LCP. Probes also tend to have warm caches, corporate networks, and no ad blockers — the opposite of a first-time user.

Use synthetics for:

- Availability SLOs with a clear locator (HTTP 200 from this POP)
- Multi-step journeys you own (login → search → pdp) with test accounts
- Regression gates in CI against a lab device

## RUM is a survey, not a census

Sampling, consent, ad blockers, and "the app crashed before the beacon" all bias RUM. A 2% sample weighted toward power users will look faster than reality. Field data (CrUX, your own beacons) is still the only way to see INP on real devices.

Use RUM for:

- Percentiles by geography, device class, URL pattern
- Correlating a release with a field regression
- Finding the page that is actually slow, not the one in the synthetic script

## One SLO, two signals

A reasonable pattern: availability from synthetics (you need a pager when *nobody* can buy), latency from RUM p75/p95 with a device filter that matches the business (maybe exclude internal office IPs). When they diverge, write the sentence: "synthetics still pass because Virginia is fine; RUM p75 LCP moved 400ms in APAC after we shipped a 2MB hero image." That sentence is the monitoring system working.

Do not average RUM with synthetics into one number. You will hide both stories.

If budget allows only one, start with synthetics for a mostly-empty product (no users yet) and add RUM the week you have enough traffic to not overfit a handful of sessions. If you already have traffic, RUM first, synthetics as the night watch.
