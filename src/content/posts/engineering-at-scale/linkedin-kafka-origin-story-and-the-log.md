---
title: "Why a Job Site Invented Kafka"
slug: "linkedin-kafka-origin-story-and-the-log"
description: "How LinkedIn's tangle of point-to-point data pipelines led to Kafka's commit-log abstraction, and how one internal tool became industry infrastructure."
publishedAt: "2025-10-20"
category: "LinkedIn"
tags:
  - Engineering at Scale
  - LinkedIn
  - Kafka
  - Streaming
---

Around 2010, LinkedIn's data infrastructure had a shape that will feel familiar to any engineer who has worked at a fast-growing company: every system that produced data — the main database, search indexing, the recommendation engine, monitoring — had grown its own custom, point-to-point integration with every system that needed to consume it. That's an integration problem that grows roughly with the square of the number of systems, and LinkedIn was adding new systems constantly. Existing message queues like ActiveMQ and RabbitMQ weren't a natural fit either: they weren't designed for the sheer throughput of LinkedIn's activity data — page views, clicks, and other high-volume events — or for the durability and replay semantics needed to feed batch systems like Hadoop reliably.

## One abstraction instead of many pipelines

The insight that became Kafka, credited to Jay Kreps, Neha Narkhede, and Jun Rao, was to stop treating this as many separate integration problems and instead build one unifying abstraction: a distributed, partitioned, replicated commit log. Producers append events to the log. Consumers read from it at their own pace, tracking their own position (offset) independently of the producer and of every other consumer. The log retains data for a configurable window of time, which means a real-time dashboard, a Hadoop ETL job, and a search indexer can all read the same underlying stream of events without coordinating with each other or requiring the producer to know who's listening.

That design choice — consumers pull and track their own offsets, rather than the broker pushing and tracking delivery per-consumer — turned out to be central to Kafka's ability to scale to very large numbers of independent consumers without the broker becoming a bottleneck.

## Becoming LinkedIn's central nervous system

Kafka quickly became the backbone connecting most of LinkedIn's systems: tracking user activity events end to end, feeding data warehouse ETL pipelines, and powering the data flows behind features like "People You May Know" and news feed relevance. It also became foundational for log aggregation and operational metrics, effectively becoming the plumbing every new system was built to plug into rather than something bolted on afterward.

Kreps later articulated the underlying philosophy in a widely cited essay, "The Log: What every software engineer should know about real-time data's unifying abstraction," arguing that a single append-only log, treated as the source of truth, could serve as the foundation both real-time stream processing and batch processing derive from — rather than treating real-time and batch as fundamentally separate problems requiring separate pipelines.

## From internal tool to industry infrastructure

LinkedIn open sourced Kafka in 2011 and later donated it to the Apache Software Foundation. Kreps, Narkhede, and Rao went on to found Confluent to build commercial infrastructure around it. What started as a fix for LinkedIn's internal pipeline sprawl became one of the most widely deployed pieces of streaming infrastructure in the industry, well beyond anything specific to LinkedIn's original use case.

## What you can borrow

- When many systems all need to react to the same events, a shared append-only log usually scales better than building N separate point-to-point integrations.
- Let consumers track their own offsets and read at their own pace rather than pushing delivery-tracking responsibility onto the producer or broker.
- A bounded retention window lets you decouple real-time and batch consumers off the exact same underlying stream, instead of maintaining separate pipelines for each.
- Solving your own internal integration sprawl sometimes produces infrastructure worth open sourcing — the problem is rarely as company-specific as it first appears.
