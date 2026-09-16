---
title: "Forrest: ByteDance's Recommendation Architecture for a Feed That Cannot Be Stale"
slug: "bytedance-forrest-recommendation-architecture"
description: "How ByteDance's Forrest-style recommendation stack splits retrieval, ranking, and real-time features so a For You feed can update as user behavior arrives."
publishedAt: "2026-12-07"
updatedAt: "2026-12-07"
category: "ByteDance"
tags:
  - Engineering at Scale
  - ByteDance
  - Machine Learning
  - Recommendations
sources:
  - title: "ByteDance Tech Blog"
    publisher: "ByteDance"
    url: "https://tech.bytedance.com"
  - title: "ByteDance research"
    publisher: "ByteDance"
    url: "https://arxiv.org/search/?query=bytedance&searchtype=all"
---

A ByteDance feed is a latency SLA wrapped around a multi-stage recommender. The user will swipe. Each swipe is a new request for candidates that must feel personal without scanning a billion videos. Public talks and papers from ByteDance describe stacks with names that have included Forrest: a service architecture for recommendation that stitches retrieval, pre-ranking, ranking, and re-ranking, with a feature system that can consume real-time events. The brand of the internal platform matters less than the split: you cannot run a 200-feature deep model on every item in the corpus on every request.

## Multi-stage is a budget

Retrieval (ANN, inverted tags, social graph, geography) produces hundreds or thousands of IDs. Pre-rank cheaply drops the hopeless. A heavier ranker scores the rest. Re-rank applies diversity, integrity, and business rules (not too many ads in a row, not too much similar sound). Each stage has a latency budget and a failure mode: if retrieval is empty, the ranker cannot save you; if re-rank is naive, the feed looks like one creator.

Forrest-like platforms standardize how teams publish models and features onto this pipeline so every product (short video, search, ads) is not a snowflake. Feature freshness is the competitive axis. A like three seconds ago should influence the next swipe. That is a streaming path into an online store, not a nightly Hive table.

## The item and user towers

Two-tower retrieval (user embedding vs item embedding) lets you ANN-search items. The towers drift if training is batch-only. ByteDance's later public work on Monolith (real-time training) is the same story in a different layer: embeddings must move as the corpus and the user move. Architecture without a training loop is a pretty diagram of stale vectors.

Negative sampling, exploration, and cold-start for new items are product-and-model together. A pure exploit ranker will never show a new creator. A pure explore ranker will feel broken. The service must allow mixing.

## Failure modes of feed recommenders

The concrete failure is a real-time feature delay of minutes while the model assumes seconds, so the feed cannot "listen" and users mash skip. Mid-size steal: end-to-end freshness SLOs, not only model AUC.

Operational gotcha: ANN index rebuilds that swap embeddings with a different version than the user tower, so inner products are noise. Version indexes and models as a pair. Another is cascading failure: ranker timeout, fallback to popularity, a celebrity video hits everyone, the CDN and comments melt. Fallbacks need diversity too. Integrity: a recommender that maximizes watch time will recommend bait. Put policy models in re-rank with teeth. If you only have a batch pipeline, do not promise a "living" feed. Log exposures and downstream watches with the same request id or you cannot train. Capacity: ranking 10x candidates "to be safe" will miss the latency SLO and then skip the good model. Measure which stage drops quality when you cut candidates. That is how you spend CPU. Integrity queues and copyright filters belong in the same request path as ranking, with timeouts, or a slow policy service becomes a blank feed that users will not forgive as "model quality."

## What you can borrow

- Split retrieval, rank, and re-rank with explicit latency budgets and candidate counts.
- Version user towers and item ANN indexes together.
- Put freshness SLOs on features that the model was trained to expect.
- Design fallbacks that are not a single global popular list.
