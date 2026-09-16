---
title: "The Feature Store Behind DoorDash's Real-Time ML Predictions"
slug: "doordash-feature-store-low-latency-ml-serving"
description: "How DoorDash built a feature store to serve consistent, low-latency machine learning features across dispatch, search, and fraud detection."
publishedAt: "2025-11-10"
updatedAt: "2026-09-16"
category: "DoorDash"
tags:
  - Engineering at Scale
  - DoorDash
  - Machine Learning
  - Data Infrastructure
---

Every machine learning model DoorDash runs in production — estimating delivery time, ranking search results, detecting fraud, optimizing dispatch — depends on features: numerical or categorical signals like a Dasher's recent acceptance rate, a merchant's average prep time, or a customer's order history. The hard part isn't training a model with good features; it's serving the exact same features, computed the exact same way, at low latency, in production, at the moment a prediction is actually needed. DoorDash built a feature store specifically to solve that gap, since without it, teams tend to reimplement feature computation logic independently for training and serving, and those two implementations quietly drift apart over time.

## Training-serving skew is the problem no one notices until it hurts

A classic failure mode in applied machine learning is training-serving skew: a feature is computed one way from historical data during model training — perhaps a nightly batch job joining several tables — and computed a subtly different way at inference time, perhaps by a different service reading live data with different edge-case handling. The model performs well in offline evaluation but degrades in production, and diagnosing why becomes a scavenger hunt through two independent codepaths that were supposed to compute the same thing. A feature store addresses this directly by giving both training and serving a single definition of each feature, computed once and read from consistently by both paths.

## Two speeds, one source of truth

DoorDash's feature infrastructure needs to serve two very different consumption patterns well. Some features are slow-changing and can be precomputed in batch — a merchant's average rating over the last month, for instance — while others need to reflect near-real-time state, like a Dasher's current location or how many orders are currently active in a market. The feature store architecture typically layers an online store, backed by a low-latency key-value system for serving fresh feature values at prediction time, on top of an offline store used for training, with a shared pipeline responsible for keeping both in sync from the same underlying event and data sources.

```text
Raw events / tables
        |
   feature pipeline (single definition per feature)
        |         \
  offline store    online store
  (training)        (low-latency serving)
```

## Latency budgets shape the whole design

Because predictions like dispatch assignment or fraud scoring happen inline in a user-facing or time-sensitive flow, feature retrieval at serving time has to fit inside a tight latency budget alongside everything else the request needs to do. This pushed DoorDash's feature store toward aggressive caching, precomputation wherever a feature doesn't strictly need to be real-time, and careful indexing of the online store so that fetching dozens of features for a single prediction request doesn't itself become the bottleneck in an otherwise fast system.

## Making features reusable across teams

Beyond consistency and latency, a feature store pays off organizationally: once a feature like "Dasher's rolling acceptance rate" exists in the store, any team building a new model can reuse it rather than rebuilding the same computation from scratch, which both saves engineering effort and reduces the number of subtly different versions of the same underlying signal floating around the company's models.

## What broke when they scaled

Training-serving skew is the quiet killer: the model learned `merchant_avg_prep_30d` from the warehouse; production computes a slightly different window, or misses a timezone, and dispatch quality falls while dashboards still show "model AUC is fine." DoorDash's feature-store writing stresses a single definition materialized at two speeds — batch to offline training tables, streaming or request-time lookup to an online KV — so names match.

Online serving has a latency budget inside search and dispatch (milliseconds). If the store is "just Cassandra with a cache," a miss pattern during dinner becomes an SLO breach. Features that require joins at request time do not belong in the hot path; they belong precomputed. Point-in-time correctness for training (no leakage from the future) is another scaling footgun: naive dumps of current feature values into historical labels invent performance.

Reuse across teams only works with ownership. A `user_cancel_rate` without a grain and an owner will be forked.

## A smaller-team version of the same idea

A YAML list of features, a Spark/SQL job that writes parquet for training, and Redis for the ten features the live model needs. Log feature vectors with predictions. Join training labels using timestamps that would have been available at serve time. Do not build Feast-on-Kubernetes until that logging exists.

## What you can borrow

- Treat training-serving skew as a design problem to eliminate, not a bug to debug after the fact — one definition per feature, used by both paths.
- Split features into batch-friendly and real-time tiers, and only pay the cost of true low-latency computation for the features that actually need it.
- Budget feature retrieval latency explicitly if predictions happen inline in a user-facing flow; it's easy for feature lookups to quietly dominate response time.
- Make features a shared, reusable asset across teams rather than letting each model reimplement its own version of common signals.
