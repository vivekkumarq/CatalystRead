---
title: "RUM versus Synthetic Monitoring: Two Clocks for the Same User Promise"
slug: "rum-vs-synthetic-monitoring"
description: "What real-user monitoring actually samples, why synthetics still catch the outage in a region with no traffic, and how to budget both without two sources of truth."
publishedAt: "2026-08-27"
updatedAt: "2026-09-16"
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

## A worked example

Checkout SLO: 99.9% of synthetic journeys in two regions complete in under 8s, paged to on-call. Product SLO: RUM p75 LCP on `/checkout` for mobile, excluding staff IPs, stays under 2.5s, reviewed weekly. A release ships a new font. Synthetics in Virginia stay green (cached POP, broadband). RUM p75 LCP on mobile in Brazil moves 600ms. You revert the font, not the health check.

Instrument synthetics with the same URL templates as users, including query params that change cache keys. A probe that always hits `/` will not see a broken `/checkout?step=2`.

## Failure modes

Consent banners that block RUM until click under-count the slowest first-timers. Synthetics using production logins that share one cart create inventory fights. Averaging desktop and mobile RUM hides a mobile regression. CrUX lags days; using it as a ship gate for a same-day hotfix is too slow. Double-counting SPA route changes as new pageviews inflates "visits" and can make duration metrics look better.

Ad blockers drop beacons from the users who also have the most extensions slowing the page — optimistic bias.

## When this is the wrong tool

Synthetics cannot tell you whether the new recommendation carousel is janky on a mid-range Android. RUM cannot page you when a region has zero traffic and a cert expired. Neither replaces tracing for a slow API behind a fast paint. If you have no users, do not buy an enterprise RUM suite; a few synthetics and lab Lighthouse in CI are enough. If you already have dense tracing and CrUX, a third vendor duplicating INP may only add dashboards.

## Review checklist

- Availability pages from synthetics; field latency from RUM — not one blended number.
- Sample rate, consent, and bot filters are documented for RUM percentiles.
- Synthetic journeys use test accounts and a locator that matches the SLO.
- Divergences get a written sentence (region, device, release), not a chart war.
