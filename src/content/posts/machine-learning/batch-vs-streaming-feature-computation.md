---
title: "Batch vs. Streaming Feature Computation"
slug: "batch-vs-streaming-feature-computation"
description: "How to decide when features need real-time streaming computation versus a scheduled batch job, and how to keep the two consistent with each other."
publishedAt: "2026-05-11"
updatedAt: "2026-09-16"
category: "Machine Learning"
tags:
  - Machine Learning
  - MLOps
  - Data Engineering
  - Feature Engineering
---

Every feature in a production ML system has a freshness requirement, whether or not anyone wrote it down. "Customer lifetime value" can be a day stale without anyone noticing. "Number of failed login attempts in the last 5 minutes" being a day stale makes your fraud model useless. Choosing batch versus streaming computation is really about matching engineering cost to that freshness requirement, not defaulting to whichever is more fashionable.

## Batch: the right default until proven otherwise

Batch feature computation runs on a schedule — hourly, daily — over accumulated data, typically in a data warehouse or Spark job, and writes results to a feature store that serving reads from. It's simpler to build, easier to debug (you can rerun a batch job and inspect intermediate output), and cheaper to operate, because you're not paying for always-on infrastructure.

```python
# Simplified daily batch feature job
def compute_daily_features(spark, date):
    transactions = spark.read.parquet(f"s3://data/transactions/{date}")
    features = (
        transactions
        .groupBy("customer_id")
        .agg(
            F.avg("amount").alias("avg_amount_30d"),
            F.count("*").alias("txn_count_30d"),
        )
    )
    features.write.mode("overwrite").parquet(f"s3://features/{date}")
```

The failure mode to watch for: a batch job that runs at 2am means every feature it produces is, at best, hours stale by the time it's used for an 8am prediction, and at worst a full day stale if that job fails and you're serving yesterday's numbers without anyone noticing.

## Streaming: only when the freshness requirement demands it

Streaming feature computation processes events as they arrive — via Kafka, Kinesis, or a stream processor like Flink — and updates feature values continuously, typically stored in a low-latency key-value store like Redis for serving to read at prediction time.

```python
# Simplified stream processor pseudocode
def on_event(event, state_store):
    key = event["customer_id"]
    window = state_store.get(key, default=RollingWindow(minutes=5))
    window.add(event)
    state_store.set(key, window)
    return {"failed_logins_5min": window.count()}
```

This buys you real-time freshness at real engineering cost: you now need to operate stateful stream processing infrastructure, handle out-of-order and late-arriving events, and reason about windowing semantics that don't come up in a daily batch job. Reach for it when the feature's value genuinely changes meaningfully within the latency window your batch job would otherwise impose — fraud signals, real-time bidding, anything where "5 minutes ago" and "now" are meaningfully different states.

## The trap: training-serving skew between the two paths

The most damaging mistake in this space isn't picking the wrong one — it's implementing the same logical feature two different ways: once in a batch job for training data, and once in a streaming job for serving, with subtly different windowing, null handling, or aggregation logic between them. The model trains on one definition of "average transaction amount over 30 days" and serves on a slightly different one, and nobody notices until performance degrades in a way that doesn't show up in offline evaluation.

| Approach | Latency | Engineering cost | Best for |
|---|---|---|---|
| Batch | Minutes to a day | Low | Slow-changing features (CLV, tenure, historical aggregates) |
| Streaming | Sub-second to seconds | High | Fast-changing, time-critical signals (fraud, real-time recs) |
| Batch with on-demand recompute | Seconds | Medium | A middle ground — compute at request time from recent raw data |

## The architecture that avoids the skew

The durable fix is a shared feature definition, expressed once, that both pipelines execute — a framework like Feast or a feature-store platform that lets you write the transformation logic once and compile it to both a batch job and a streaming job, rather than hand-writing the same logic twice in different languages or frameworks. If your team can't yet invest in that shared abstraction, the fallback is at minimum a shared test suite that runs both implementations against the same sample events and asserts identical output — cheap insurance against a bug that would otherwise hide for months.

## A worked failure mode

Training uses T-1 day batch features; serving uses a stream that includes a click that is almost the label. Offline AUC is 0.94; production is chance. A stream lag then fills zeros and scores collapse. The failure is skew and freshness. Share pipelines, ban future-adjacent features, and SLO the stream.

## When this is the wrong tool

Streaming feature platforms are the wrong tool for a daily batch. Batch point-in-time is the wrong tool if you promised sub-second features you do not compute. Pick the decision cadence first.

The wrong-tool test is easier with a concrete customer. If a user can lose money, lose access, or see someone else's data when "Batch vs. Streaming Feature Computation" is slightly misapplied, do not let the pattern ride on defaults. Tighten the API, add an assertion in CI, and refuse silent fallbacks that look like success. Most production failures here are not exotic; they are a missing bound, a missing key, or a missing check that the original paper assumed a careful operator would have.
