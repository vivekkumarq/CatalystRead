---
title: "Game Days: How Stripe Rehearses Failure Before Black Friday"
slug: "stripe-game-days-load-testing-black-friday"
description: "Why Stripe deliberately triggers failures and runs large-scale load tests against production-like systems before its highest-traffic days of the year."
publishedAt: "2026-01-20"
updatedAt: "2026-09-16"
category: "Stripe"
tags:
  - Engineering at Scale
  - Stripe
  - Reliability
  - Load Testing
sources:
  - title: "Stripe Engineering Blog"
    publisher: "Stripe"
    url: "https://stripe.com/blog"
---

The worst time to discover that a failover doesn't actually work, or that a service falls over at twice its normal load, is during the highest-traffic event of the year, with real money and real customers on the line. Stripe's traffic isn't flat — it spikes hard around events like Black Friday and Cyber Monday, when merchants across the platform see checkout volume multiples of a normal day, all arriving in the same compressed window. Rather than hoping the system holds up when that day arrives, Stripe has written about deliberately rehearsing failure beforehand, through game days and large-scale load tests run well in advance.

## Load testing to a number, not a feeling

Knowing a system "seems fine" under normal traffic says very little about what happens at three or five times that volume. Stripe runs load tests that push synthetic traffic through its systems at multiples of expected peak volume, aiming to find the actual breaking point of a service — where latency starts climbing, where a queue starts backing up, where a downstream dependency becomes the bottleneck — before that breaking point is discovered live. This turns capacity planning from a guess into a measurement: instead of assuming a service can handle the projected Black Friday peak, the peak is simulated ahead of time and the service either holds or reveals exactly where it doesn't.

## Game days: breaking things on purpose

Load testing answers "how much traffic can this take." Game days answer a different question: "what happens when a specific thing actually breaks." Stripe runs exercises where a team deliberately fails a real component in a controlled way — taking down a datastore, killing a service, injecting latency into a dependency — and then observes whether the systems and the on-call engineers respond the way everyone assumed they would. This is deliberately uncomfortable by design: a failover mechanism that has never actually been triggered is a hypothesis, not a tested fact, and the only way to know it works is to make it fail and watch what happens.

## Rehearsing the humans, not just the systems

A significant part of what a game day tests isn't code at all — it's whether an on-call engineer notices the right alert, follows the right runbook, and escalates correctly under simulated pressure. Automated failover can mask a gap in human response that only shows up when a human actually has to intervene, so game days that involve real engineers responding in real time surface gaps that a purely automated chaos test would miss: a runbook that's out of date, a dashboard that doesn't show the metric that actually matters during this specific failure, an escalation path with a broken link.

## Finding problems on a Tuesday, not a Friday in November

The entire point of doing this work well before the actual high-traffic event is that failures found during a game day or load test are cheap — they can be fixed, retested, and verified with time to spare. The same failure discovered live during peak Black Friday traffic is expensive in every sense: lost transactions for merchants, incident response under real pressure, and a fix that has to happen while the system is still under unusual load rather than during a calm rehearsal window.

## Operational gotchas of payments game days

Stripe's game days and peak tests have to include issuers, webhooks, and dashboard as well as the charge API, because merchants experience the union. Mid-size steal: a peak test that runs a real-ish payment method in a sandbox, fires webhooks at customer-like endpoints, and still hits your rate limits on purpose.

The concrete failure mode is a load test against a mocked processor that always returns 200 in 5ms, then production issuer latency of 800ms fills thread pools. Another is testing create-charge without refunds, disputes, or idempotent retries. Operational gotcha: test data that pollutes fraud models or search indexes if it leaks into prod. Isolate. Black Friday for payments is a long tail of long-tail BINs and currencies; include more than your home country. Coordinate with partners on rate limits or you DDoS them and they block you for the real peak. Freeze windows need a named exception for security patches. After the game day, the artifact is a capacity number you will not exceed without a plan: "we can take Nx yesterday's p99 QPS with p99 < Y." If you cannot say that sentence, you had a ceremony, not a test. Repeat it as the product mix changes; a new marketplace feature is a new peak shape.

## What you can borrow

- Load test to a specific multiple of your expected peak, not just "more than usual" — pick a number and prove the system holds at it.
- Schedule chaos or failure-injection exercises before your highest-stakes traffic events, not as a one-off after an incident.
- Test the humans as much as the systems — a runbook or alert nobody has actually used under pressure is unverified.
- Treat a fixed failure mode discovered during a rehearsal as a win, not a problem — that's the exercise working as intended.
- Repeat these exercises regularly; a system and team that passed a game day a year ago has likely changed enough that the result no longer applies.
