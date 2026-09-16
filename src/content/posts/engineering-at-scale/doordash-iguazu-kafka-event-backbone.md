---
title: "Iguazu: DoorDash's Kafka-Based Backbone for Analytics and ML"
slug: "doordash-iguazu-kafka-event-backbone"
description: "How DoorDash built a unified, Kafka-based event pipeline named Iguazu to feed analytics and machine learning from a sprawling microservices fleet."
publishedAt: "2025-09-28"
updatedAt: "2026-09-16"
category: "DoorDash"
tags:
  - Engineering at Scale
  - DoorDash
  - Kafka
  - Data Engineering
---

Once a platform splits into many independent microservices, a new problem appears that a monolith never had: every service produces useful signal — an order was placed, a Dasher accepted a delivery, an app screen was viewed — but that signal is scattered across dozens of independently owned systems with no shared way to collect, validate, or route it. DoorDash's analytics and machine learning teams needed a consistent stream of events from across the whole platform, not a patchwork of one-off integrations each service team built independently, which led to Iguazu, DoorDash's centralized event ingestion platform built on Kafka.

## One paved path instead of many one-off pipelines

Before a unified event platform existed, the common failure pattern was each service team inventing its own way to get data out — direct database dumps, ad hoc scripts, bespoke logging pipelines — each with different reliability guarantees, different schemas, and different amounts of engineering investment. That approach doesn't scale organizationally: every new consumer of event data has to learn a different integration per producer, and every producer team has to solve reliable delivery from scratch.

Iguazu's approach was to give every service a single, well-supported way to emit events — through Kafka topics with defined schemas — so producers only need to integrate once, and consumers, whether that's a real-time fraud detection system, a batch analytics job, or a machine learning feature pipeline, can all read from the same well-governed stream rather than each building custom extraction logic against a dozen different services.

## Schema enforcement as the unglamorous but critical piece

A shared event pipeline is only as useful as the trustworthiness of the data flowing through it, so a meaningful part of Iguazu's design is schema validation and enforcement at the point events are produced, catching malformed or incompatible events before they propagate downstream and corrupt an analytics dashboard or a training dataset. This is the kind of infrastructure investment that doesn't show up in a feature demo but determines whether hundreds of downstream consumers can trust the pipeline enough to build critical systems on top of it.

```text
Service A --\
Service B ---> Kafka topics (schema-validated) --> Iguazu --> consumers:
Service C --/                                                - analytics warehouse
                                                               - real-time ML features
                                                               - fraud detection
```

## Serving both real-time and batch consumers from one source

A key design goal was serving two very different consumption patterns from the same underlying event stream: real-time systems like fraud detection or live operational dashboards that need events within seconds, and batch systems like the analytics warehouse or offline model training pipelines that consume the same events on an hourly or daily cadence. Rather than building and maintaining two separate pipelines, Iguazu routes the same validated event stream to both real-time stream processors and batch data warehouse loaders, meaning a single well-tested producer integration serves every downstream use case at once instead of each new use case requiring its own producer changes.

## Reliability at the edges, not just the middle

Because Iguazu sits between hundreds of producing services and dozens of consuming systems, DoorDash had to design carefully for the failure modes at both edges — a producing service having a bad deploy shouldn't be able to flood the pipeline with malformed events, and a slow or failing consumer shouldn't be able to back up the whole system for everyone else. Isolating producers and consumers from each other's failure modes, while still sharing the same underlying event backbone, was as much of the engineering effort as the initial pipeline build.

## What broke when they scaled

Microservices without a paved event path produce a zoo of "I'll POST to your webhook" integrations, each with its own retry and schema. DoorDash's Iguazu work (named in their engineering blog) is a Kafka-centered backbone: producers emit once, many consumers (analytics, ML, search index, billing) subscribe. The break at scale is poison schemas and silent field reuse. A boolean that used to mean "is_dashpass" now means something else and every downstream model quietly degrades.

Schema registry and compatibility checks are the unglamorous core. So is partitioning: a hot restaurant id as a key concentrates a lunch rush on one partition. Consumer lag during that rush is a product outage for anything that thought Kafka was "real time." Exactly-once is a myth across the whole company; Iguazu-style platforms usually give at-least-once plus idempotent consumers and a documented lag SLO.

Dual use — stream processing and dump-to-warehouse — means one bad producer can both page the feature store and blow the data lake bill.

## A smaller-team version of the same idea

One Kafka (or even one SQS) topic per important fact (`order_placed`), Avro/JSON schema in git, a warehouse sink, and one streaming consumer. Prohibit ad-hoc HTTP fan-out for analytics. Add a registry when the third consumer appears. Watch lag. Compact topics that are really changelogs.

## What you can borrow

- Build one well-supported way to emit events across your organization rather than letting every team invent its own extraction pipeline.
- Enforce schemas at the point of production; the cost of validating early is much lower than the cost of cleaning corrupted downstream data later.
- Serve both real-time and batch consumers from the same validated stream instead of maintaining parallel pipelines that can drift out of sync.
- Isolate failure domains between producers and consumers so one bad actor on either side can't degrade the shared pipeline for everyone.
