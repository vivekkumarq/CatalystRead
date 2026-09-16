---
title: "The Feature Infrastructure Behind Pinterest's Home Feed Ranking"
slug: "pinterest-ml-feature-infrastructure-home-feed-ranking"
description: "How Pinterest built shared machine learning feature infrastructure to rank home feed content consistently across training and real-time serving."
publishedAt: "2026-02-02"
updatedAt: "2026-09-16"
category: "Pinterest"
tags:
  - Engineering at Scale
  - Pinterest
  - Machine Learning
  - Recommendation Systems
---

Ranking what shows up in a Pinterest home feed is ultimately a machine learning problem: given a huge pool of candidate pins, predict which ones a specific person is most likely to engage with right now, and order accordingly. That prediction depends on features drawn from several very different sources — signals about the pin itself, signals about the user's long-term interests, and signals about very recent activity, sometimes from actions taken just seconds earlier in the same session. Building infrastructure that can compute and serve all three kinds of features consistently, at the latency a live feed request demands, was as much of an engineering problem for Pinterest as the ranking models themselves.

## Three different time scales, one ranking request

A useful way to think about home feed features is by how quickly they change. Pin-level features — the content category, aggregate historical engagement, visual and text embeddings — change slowly and can be computed well ahead of time in batch. User-level features — long-term interest profiles built from months of pinning history — also update on a relatively slow cadence and can largely be precomputed. But session-level features — what a user just clicked, searched, or saved in the last few minutes — need to be fresh enough to actually influence the very next set of recommendations shown to them, or the feed feels stale and unresponsive to what the person is clearly doing right now.

```text
Pin features:      precomputed batch, slow-changing
User features:      precomputed batch, slow-changing
Session features:   real-time, computed from recent events
                     -> must be fresh at request time
```

Serving a ranking request means pulling features from all three tiers and combining them within the ranking model's inference call, which means the infrastructure has to make very different freshness and latency trade-offs meet at a single point without any one tier becoming the bottleneck for the whole request.

## Keeping training and serving features consistent

As with any large-scale recommendation system, Pinterest's feature infrastructure had to solve the training-serving consistency problem: a feature computed one way during offline model training and a subtly different way during live serving produces a model that performs worse in production than its offline evaluation suggested, often in ways that are difficult to diagnose after the fact. The fix is architectural rather than procedural — define each feature once, in a shared pipeline, and have both the offline training data generation and the online serving path draw from that same definition, rather than trusting two separately maintained implementations to stay in sync by convention.

## Feature reuse across many ranking surfaces

Home feed is only one of several places at Pinterest where ranking matters — search results and related-pins recommendations also depend on overlapping sets of features, like a pin's engagement history or a user's interest profile. Building shared feature infrastructure meant these different ranking surfaces could reuse the same underlying feature definitions and computation pipelines rather than each product surface's team independently rebuilding similar signals, which reduced both engineering duplication and the risk of subtly inconsistent versions of "the same" signal existing across different parts of the product.

## Operational gotchas of homefeed features

Homefeed ranking needs features that are fresh enough to reflect a just-saved pin and stable enough to train on yesterday's logs. The gap between those clocks is where quality dies. Mid-size teams train on warehouse tables and serve from Redis keys that were never the same columns. Steal a feature log: persist the vector you served, join it in training, and alert on missing-feature rates.

The concrete failure mode is a pipeline delay after a producer outage; the model silently scores zeros and the feed becomes generic popularity. Users think the product "got worse" with no deploy. Another gotcha is leaked labels: using a feature that is only known after the click, or using the viewer's own subsequent action, which will not exist online. Point-in-time correctness is an ops problem, not only a science one. Feature stores with online/offline skew on types — float vs stringified float — produce tiny numeric bugs that A/B tests misread as wins. Capacity: computing huge user embeddings on the request path without a cache will miss SLA and skip personalization, which can look like a successful fallback until engagement tanks. Budget a stale-but-present embedding over a missing one. Own a pager for feature freshness the same way you own API latency.

## What you can borrow

- Categorize your own features by how fast they change, and only pay real-time computation costs for the tier that genuinely needs freshness.
- Define each feature once in a shared pipeline consumed by both training and serving, rather than trusting two independent implementations to match.
- When multiple product surfaces need similar signals, build shared feature infrastructure rather than letting each team reinvent overlapping computations.
- Freshness matters most for session-level signals; don't over-invest in real-time infrastructure for features that genuinely change slowly.
