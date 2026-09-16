---
title: "Queues vs Streams in Cloud Messaging: Picking the Right Primitive"
slug: "queues-vs-streams-in-cloud-messaging"
description: "The real architectural differences between message queues and event streams, and why picking the wrong one causes problems that only show up under load."
publishedAt: "2025-11-03"
updatedAt: "2026-09-16"
category: "Cloud"
tags:
  - Cloud
  - Messaging
  - Architecture
  - AWS
---

Queues and streams both move messages from a producer to a consumer, and it's tempting to treat the choice between something like SQS and something like Kinesis or Kafka as interchangeable, differing mainly in throughput. The actual difference is in delivery semantics and how consumers relate to the data, and picking the wrong one shows up as a real architectural problem once you need a second consumer or need to replay history.

## Consumption model: destructive versus durable

A queue is fundamentally a work-distribution mechanism: a message is delivered to one consumer, that consumer processes it, and the message is removed. If you add a second consumer group wanting the same messages for a different purpose, a standard queue can't fan that out — the first consumer to grab a message takes it, and there's no independent replay for the second consumer.

```python
# SQS: a message consumed here is gone for everyone else
response = sqs.receive_message(QueueUrl=queue_url, MaxNumberOfMessages=10)
for msg in response.get('Messages', []):
    process(msg)
    sqs.delete_message(QueueUrl=queue_url, ReceiptHandle=msg['ReceiptHandle'])
```

A stream, by contrast, retains messages for a configured retention window and lets multiple independent consumer groups each track their own read position:

```python
# Kinesis: multiple consumers can each read from their own position
records = kinesis.get_records(ShardIterator=shard_iterator, Limit=100)
# a second, independent consumer reads the same records from its own iterator
```

That difference — destructive read versus durable log with independent offsets — is the real dividing line, not throughput.

## When a queue is the right choice

Queues fit work-distribution problems well: a pool of workers pulling jobs off a queue, where each job should be processed exactly once by exactly one worker, and there's no need for a second system to independently replay the same events. Order processing, image resizing jobs, and email sending queues are classic fits:

```yaml
# SQS with a dead-letter queue for failed processing attempts
RedrivePolicy:
  deadLetterTargetArn: !GetAtt OrderProcessingDLQ.Arn
  maxReceiveCount: 3
```

The dead-letter queue pattern — moving a message aside after repeated processing failures — is a queue-native concept that doesn't map cleanly onto a stream, where "processing failure" for one consumer group shouldn't block or remove data that other consumer groups still need to read.

## When a stream is the right choice

Streams fit event-sourcing and fan-out scenarios: the same sequence of events needs to reach multiple independent systems, each processing it for a different purpose — an analytics pipeline, a search index updater, and a notification service, all reading the same order-placed events without contending with each other.

```yaml
# Kafka topic consumed independently by three consumer groups
# consumer group: analytics-pipeline
# consumer group: search-indexer
# consumer group: notification-service
```

Streams also support replay — reprocessing historical events when a new consumer needs to backfill state, or when a bug in a consumer requires reprocessing a window of past events. That replay capability, bounded by the retention period, is something queues fundamentally don't offer once a message is deleted.

## The ordering guarantee people assume incorrectly

A common bug: assuming a queue or stream guarantees global ordering across all messages, when most systems only guarantee ordering within a partition or a FIFO group. SQS standard queues offer no ordering guarantee at all; SQS FIFO and Kinesis both guarantee order only within a given message group ID or partition key.

```python
kinesis.put_record(
    StreamName='order-events',
    Data=json.dumps(event),
    PartitionKey=order_id,  # ensures all events for one order stay ordered
)
```

Choosing the partition key deliberately — here, `order_id` — is what makes per-order ordering hold. Using a random or evenly-distributed key for load-balancing purposes while assuming global ordering is a mistake that only surfaces once traffic is high enough to actually interleave across partitions.

## A worked failure mode

A team puts order events on a queue and fans out by having each consumer delete the message. A second consumer never sees the event; inventory and email diverge. They "fix" it by switching to a stream but treat it like a queue: no consumer groups, one pointer, and a poison event blocks everyone. The failure is the delivery and fan-out model. Queues are for competing consumers on a task. Streams are for replayable facts with independent offsets. Choose with the failure in mind: lost secondary consumer vs stuck partition.

## When this is the wrong tool

A stream is the wrong tool for 20 jobs a day; a table plus a worker is enough. A queue is the wrong tool if you need multiple independent readers of the same history. Do not use either as a database. HTTP retries with idempotency keys may beat both for a single downstream. Pick the primitive that matches competing work vs replay.
If a dry-run in staging with production-like volume does not reproduce the benefit, do not scale the idea on a hope and a dashboard. Ship the smaller version that you can revert in one deploy.
