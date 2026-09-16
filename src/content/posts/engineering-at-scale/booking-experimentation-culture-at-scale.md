---
title: "Booking.com's Experimentation Culture: When A/B Tests Are How the Company Thinks"
slug: "booking-experimentation-culture-at-scale"
description: "How Booking.com made controlled experiments the default decision tool, with a platform that had to assign, measure, and stop tests without wrecking the hotel funnel."
publishedAt: "2026-12-02"
updatedAt: "2026-12-02"
category: "Booking.com"
tags:
  - Engineering at Scale
  - Booking.com
  - Experimentation
  - Culture
sources:
  - title: "Booking.com Engineering"
    publisher: "Booking.com"
    url: "https://medium.com/booking-com-engineering"
  - title: "Experimentation at Booking.com"
    publisher: "Booking.com"
    url: "https://booking.design"
---

Booking.com's public engineering and design writing has long described a company that would rather run an experiment than argue from a mockup. At the scale of a global travel funnel, a 0.5% change in conversion is enormous money and also easy to fool yourself about. The culture only works if the platform makes a correct A/B test easier than a ship-and-pray deploy. That means assignment, exposure logging, metric definition, and guardrails against the ways travel data lies: seasonality, user stacking, and a booking that completes days after the click.

## Assignment is a product decision

Users must be sticky in a bucket or the page flickers and the statistics rot. Booking's experiments often cut across web and app, logged-in and anonymous, and multiple properties of the same traveler. Identity stitching — cookie to account on login — can move someone across buckets if you are sloppy; that is a bias, not a detail. Hash on a stable id, and document what happens when the id appears.

Orthogonal experiments collide. Too many tests on the same funnel interact. The platform needs overlapping experiment policies, mutually exclusive layers for things that cannot combine (two checkout button colors), and a catalog so teams can see they are about to test the same surface. Without that, "experimentation culture" is a pile of confounded p-values.

## Metrics that match travel

A click is not a night booked. A booked night can cancel. Revenue metrics need windows and attribution. Peeking every hour and stopping when p < 0.05 is how you industrialize false positives; sequential testing or fixed horizons should be built into the tool, not left as a wiki reminder. Guardrail metrics — site error rate, search latency, refund rate — must be able to auto-pause a test. A winner that tanks mobile performance is not a winner.

Booking's famous volume of tests also produces a library of "this did nothing." That library is an asset if people can find it. Otherwise the company re-runs the same button experiment every two years.

## Failure modes of industrial A/B tests

The concrete failure is assigning at page load but logging conversion with a different id, so the experiment "wins" because of a join bug. Mid-size steal: one exposure event schema, and analysis that only counts users who were actually exposed.

Operational gotcha: ramping to 100% on a Friday before a holiday weekend in a source market. Travel has spikes; your sample is not stationary. Another is SRM (sample ratio mismatch) that teams ignore because the dashboard still prints a green check. SRM is a stop-the-line signal. Feature flags and experiments sharing one system is good; using an experiment as a permanent flag is how you never clean up. Interaction effects: two winning tests shipped together lose. Keep a holdout. If you copy Booking's culture without a stats review, you will ship noise and call it empiricism. Give engineers a default analysis they cannot easily misuse, and a path to a specialist for heterogeneous treatment effects. Do not hide long-term cancellation effects by ending the measurement window at click + 1 hour.

## What you can borrow

- Make correct assignment and exposure logging easier than an un-instrumented ship.
- Encode sequential testing and guardrail auto-pause in the platform, not in a style guide.
- Watch sample-ratio mismatch as a first-class incident.
- Archive null results; they are how you stop repeating the same test.
