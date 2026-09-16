---
title: "TikTok Monolith: Training Recommendation Models While the Parameters Are Still Moving"
slug: "tiktok-monolith-realtime-training"
description: "How ByteDance's Monolith system trained sparse recommendation models online, with collisionless embeddings and a sync path from trainer to serving."
publishedAt: "2026-12-09"
updatedAt: "2026-12-09"
category: "ByteDance"
tags:
  - Engineering at Scale
  - ByteDance
  - Machine Learning
  - Recommendations
sources:
  - title: "Monolith: Real Time Recommendation System With Collisionless Embedding Table"
    publisher: "ByteDance / RecSys"
    url: "https://arxiv.org/abs/2209.07663"
  - title: "ByteDance Tech"
    publisher: "ByteDance"
    url: "https://tech.bytedance.com"
---

Batch training a recommender overnight is simple and late. By morning the memes have moved. ByteDance's Monolith paper describes a production training stack for large sparse models — the kind with enormous embedding tables for users, items, and IDs — that can update in near real time. The headline techniques are a collisionless embedding table (so hashing IDs into a fixed bucket does not smash unrelated entities together) and an architecture that streams training examples, updates parameters, and pushes them toward serving without a daily checkpoint as the only path.

## Sparse parameters are the data

A deep network's dense layers are small. The embeddings are the model. Traditional parameter servers hash IDs into a vector table; collisions are "regularization" until they are two popular creators sharing a vector. Monolith's collisionless design uses a structure that can allocate embeddings per ID, with eviction for IDs that disappear, so the table's memory tracks the live ID set. That is a systems problem: memory growth, fragmentation, and lookup latency on the training path.

Online training needs labels that arrive after the impression. A watch that happens thirty seconds later must join the impression. Late labels, partial labels, and negative implicit feedback (skip) are the data engineering. If the join is wrong, you train on noise at 10,000 QPS.

## From trainer to serving without a weekly freeze

A parameter server that updates every second is useless if serving still loads yesterday's snapshot. Monolith-style systems sync embeddings to online stores or serving shards incrementally. Consistency is not "all parameters atomic." It is "no torn vectors" and "versions that the ranker understands." Dense layers may still update more slowly than sparse ones. That split is explicit in the paper's production discussion.

Faults: a trainer that diverges (exploding gradients on a bad batch) can poison serving if you push blindly. Canaries, clipping, and the ability to freeze a table are production, not research extras.

## Failure modes of real-time recsys training

The concrete failure is a feature/join delay that trains on "user watched" using the post-watch context that serving will not have, so online AUC looks great and prod ranking dies. Mid-size steal: train/serve schema snapshots and a join that only uses features available at request time.

Operational gotcha: unbounded embedding growth until the parameter server OOMs on a viral ID explosion (bots, new item IDs). Eviction policy is a product decision: drop rare IDs and you hurt cold start; keep them and you melt RAM. Another is clock-driven "real time" that still has a 30-minute label delay; do not advertise seconds. Snapshotting for disaster recovery of a live-updating table is harder than saving a file; practice it. If you are not ByteDance, you can still stream updates to a small embedding set (session features) without a collisionless giant. Do not copy Monolith's table as a weekend port of TensorFlow. Steal the collision analysis: measure how often hash collisions mix IDs in your current system. If it is high, you have a ranking bug you called an architecture.

## What you can borrow

- Treat embedding collisions as quality bugs; measure them.
- Join labels with only request-time features or your online training will cheat.
- Canary parameter pushes; a diverged trainer should not be a live ranker.
- Bound memory with an explicit eviction policy for sparse IDs.
