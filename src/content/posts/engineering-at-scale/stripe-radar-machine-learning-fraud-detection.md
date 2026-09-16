---
title: "Radar: How Stripe Fights Payment Fraud in Real Time with Machine Learning"
slug: "stripe-radar-machine-learning-fraud-detection"
description: "How Stripe's Radar system scores payments for fraud risk in real time using machine learning trained across its network, without adding checkout friction."
publishedAt: "2025-12-15"
updatedAt: "2026-09-16"
category: "Stripe"
tags:
  - Engineering at Scale
  - Stripe
  - Machine Learning
  - Fraud Detection
sources:
  - title: "Stripe Engineering Blog"
    publisher: "Stripe"
    url: "https://stripe.com/blog"
---

Every payment Stripe processes has to be scored for fraud risk in the same breath as it's authorized — there's no batch window to run a model overnight and flag suspicious charges the next morning. A card gets charged or it doesn't, in real time, and a decision made too slowly is as useless as one made wrong. Stripe's answer to this is Radar, a machine-learning-based fraud detection system built into the same request path as payment processing, scoring transactions in milliseconds using models trained on patterns learned across Stripe's entire network of businesses rather than any single merchant's own history.

## Fraud detection needs network-scale signal

An individual merchant, even a large one, sees a limited slice of fraud patterns — a given stolen card or fraud ring might only ever be used against a handful of specific businesses before moving on. Stripe sits in a different position: because it processes payments across a huge number of merchants simultaneously, it can observe a card, a device fingerprint, or a behavioral pattern showing up as fraudulent at one merchant and use that signal to protect every other merchant on the platform, often before that same bad actor tries again elsewhere. This network effect is the central advantage Radar has over fraud tooling any single business could build in isolation, and it compounds as more businesses route more volume through the platform.

## Scoring in the critical path, not after the fact

Radar's risk scoring happens synchronously as part of authorizing a charge, which imposes a hard latency budget — the model has to return a score fast enough that it doesn't noticeably slow down checkout, because added friction at checkout is itself a cost, not a free safety measure. This pushes real engineering constraints onto the machine learning side: feature computation has to be fast, feature data has to already be available rather than fetched fresh from slow sources during the request, and the models themselves have to be efficient enough to score within a tight time budget rather than the most exhaustive model that could theoretically be trained.

## Balancing false positives against false negatives

A fraud system that blocks everything questionable will also block a meaningful number of legitimate customers, and for a payments platform, wrongly declining a real customer is its own serious cost — lost revenue for the merchant and a bad experience for someone who did nothing wrong. Radar's scoring is tunable along this tradeoff rather than a fixed yes/no gate: merchants can set how aggressively to act on a given risk score, blocking outright at high confidence while routing marginal cases to additional review or lighter friction like requiring extra verification, instead of forcing every business into the same risk tolerance.

## Models that keep learning

Fraud patterns shift constantly as bad actors adapt to whatever is currently working against them, so a model trained once and left static degrades over time. Radar's models are retrained on an ongoing basis against fresh data across the network, incorporating outcomes — confirmed fraud, disputed charges, false positives caught after the fact — so the system adapts to new fraud patterns rather than staying frozen against techniques that stopped being used months earlier.

## Operational gotchas of fraud models in the charge path

Radar-like systems sit on the authorization path: they must return in tens of milliseconds and fail in a defined direction. The concrete failure mode is a model timeout that either fails open (you eat fraud) or fails closed (you kill conversion) without a written policy for the hour the feature store is down. Mid-size steal: a rule layer that always runs, a model that can be skipped, and a budgeted latency with a default.

Operational gotcha: training on yesterday's labels while attackers shift today; a sudden drop in precision looks like a "good" week of low declines until chargebacks arrive. Watch delayed labels. Another is features that leak future information or include the decline itself. Point-in-time joins again. False positives concentrate on a country, a BIN, or a legitimate travel pattern; without per-segment dashboards you will think the model is healthy. Allowlists for known-good customers must be first-class, or support will invent a side door. Do not log raw card data in feature logs. Shadow-mode new models on live traffic before they can decline. If you cannot staff ML, steal velocity rules and device fingerprints with the same fail-open/closed decision. The model is optional. The decision SLA and the audit log of why a charge was blocked are not.

## What you can borrow

- Pool signal across as many customers or tenants as you can when building fraud or abuse detection — a single account's history is a weak dataset compared to a shared one.
- Put risk scoring in the critical path only if you can hit your latency budget; a slow, thorough fraud check that blocks checkout is often worse than a faster, slightly less precise one.
- Give downstream consumers of a risk score a tunable threshold rather than a hardcoded block/allow decision — different teams have different risk tolerances.
- Treat false positives as a real cost to measure and minimize, not just an acceptable side effect of catching fraud.
- Retrain detection models on a regular cadence with fresh outcome data; a static model against an adversarial, adapting population goes stale quickly.
