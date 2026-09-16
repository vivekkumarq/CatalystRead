---
title: "Message Queues vs. Event Streams: Picking the Right Backbone"
slug: "message-queues-vs-event-streams"
description: "Message queues and event streams solve different problems — a practical comparison of consumption models, ordering, replay, and backpressure."
publishedAt: "2025-03-21"
updatedAt: "2026-09-16"
category: "System Design"
tags:
  - System Design
  - Message Queues
  - Distributed Systems
  - Event-Driven Architecture
---

"Message queue" and "event stream" get used interchangeably in architecture docs, but they solve different problems, and choosing based on familiarity rather than consumption model is a common source of regret six months into production.

## The Consumption Model Is the Real Difference

A classic queue (SQS, RabbitMQ) is built around competing consumers: a message is delivered to exactly one worker, processed, and removed. Once consumed, it's gone. This is the natural fit for task distribution — resize an image, send an email, charge a card — where each unit of work belongs to exactly one owner.

An event stream (Kafka, Kinesis, Pulsar) keeps an append-only log and lets multiple independent consumer groups read the same events at their own pace, each tracking its own offset. The event isn't "claimed" by one worker; it's a durable record that any number of downstream systems can read, replay, or ignore.

```text
Queue:    Producer -> [msg] -> one consumer -> ack -> gone
Stream:   Producer -> [event, event, event...] -> consumer group A (offset 104)
                                                 -> consumer group B (offset 9821)
```

## Ordering, Replay, and Retention

Queues generally guarantee ordering only within a single queue or partition key, and once a message is acked it's unrecoverable — there's no "replay yesterday's traffic."

Streams retain events for a configured window (or forever, storage permitting) and guarantee order within a partition. That makes replay a first-class operation: rebuild a read model, backfill a new consumer, or reprocess after a bug fix, just by resetting an offset. This is the property that makes streams the backbone of choice for event sourcing and CDC pipelines — the log itself is the source of truth, not a side effect of delivery.

## Backpressure and Fan-out

Queues push backpressure naturally: if consumers slow down, the queue depth grows and you scale workers or shed load. Fan-out to multiple independent consumers requires an explicit pattern — SNS-to-SQS, or one queue per subscriber.

Streams make fan-out free — any number of consumer groups read independently — but backpressure is subtler. A slow consumer group doesn't block the stream; it just falls behind, and if it falls behind the retention window, it silently loses data it never got to. Monitoring consumer lag is not optional with streams the way monitoring queue depth is with queues; it's the difference between "slow" and "data loss."

## Picking One (or Both)

- Reach for a **queue** when work items are discrete tasks with a single intended owner and you want simple, low-latency delivery.
- Reach for a **stream** when multiple systems need the same events, you need replay or audit history, or you're building read models off a canonical log.
- Many real architectures use both: a stream as the durable backbone of record, with queues downstream of specific consumers for task-style work that stream semantics don't fit (e.g., a Kafka topic feeding an SQS queue that drives a worker pool with strict per-item retry and DLQ semantics).

The question that actually resolves the choice isn't throughput or latency — most modern systems can handle either. It's: does more than one system need to read this event, and do you ever need to replay it? Answer yes to either, and you're building a stream whether or not you call it one.

## A worked example

Work queue: SQS / Rabbit — each order email is consumed once, then deleted. Competing consumers. Stream: Kafka — many consumer groups independently read the same order-placed topic; retention 7 days; replay for a new projector. You do not replay SQS.

A billing service uses a queue. An analytics indexer uses a stream.

## Failure modes

Using Kafka as a queue without compaction or with a single consumer group and then wondering about disk. Using SQS as an event log (no replay). Poison messages without DLQ. Ordering assumed on a queue that does not have FIFO. Fan-out via multiple queues vs a stream — ops cost.

Huge payloads in the broker.

## When this is the wrong tool

Synchronous HTTP is enough for a user-facing request that must complete now. Do not put a queue in front of a single-threaded worker "for scale" without measuring. Streams are the wrong tool for 10 messages a day. RPC with timeout is simpler for request/response. If you need transactions across DB and message, outbox first, tool second.
