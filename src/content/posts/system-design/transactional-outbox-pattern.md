---
title: "The Transactional Outbox Pattern"
slug: "transactional-outbox-pattern"
description: "How the transactional outbox pattern makes updating a database and publishing an event atomic, without a distributed transaction."
publishedAt: "2025-08-29"
updatedAt: "2026-09-16"
category: "System Design"
tags:
  - System Design
  - Microservices
  - Message Queues
  - Reliability
---

Publishing an event after committing a database write sounds simple until you notice the two operations aren't atomic: commit the transaction, then crash before publishing, and downstream systems never hear about a change that happened. Publish first, then have the commit fail, and downstream systems hear about something that never happened. The transactional outbox pattern closes this gap without a distributed transaction.

## The Core Mechanism

Instead of publishing directly to a message broker inside the request path, write the event to an `outbox` table in the *same* database transaction as the business change. Since it's the same transaction, it's atomic by construction — both happen or neither does.

```sql
BEGIN;
  UPDATE orders SET status = 'confirmed' WHERE id = $1;
  INSERT INTO outbox (id, aggregate_id, event_type, payload, created_at)
  VALUES (gen_random_uuid(), $1, 'OrderConfirmed', $2, now());
COMMIT;
```

A separate process — a polling job or, more commonly, a change-data-capture connector (Debezium is the standard choice) tailing the database's write-ahead log — reads new outbox rows and publishes them to the actual message broker, then marks them published.

```text
[App writes order + outbox row in one TX]
          |
          v
   outbox table (durable, same DB)
          |
          v
  [CDC connector tails WAL] ---> Kafka topic ---> consumers
```

## Why CDC Beats Polling

A polling worker (`SELECT * FROM outbox WHERE published = false`) works but adds latency proportional to poll interval, and a naive implementation can double-publish under concurrent workers unless it locks rows carefully. CDC-based approaches read the database's own replication log, which the database already produces for every committed write, so there's no added query load and typically sub-second delivery latency. The trade is operational: running Debezium, or an equivalent, is another piece of infrastructure to manage, with its own failure modes around connector offsets and schema changes.

## At-Least-Once, Not Exactly-Once

The outbox pattern guarantees the event is *eventually* published if the transaction committed — it does not guarantee it's published exactly once. A connector can crash after publishing but before marking a row processed, and redeliver on restart. This means every consumer of outbox-sourced events has to be idempotent, the same requirement any at-least-once delivery system carries. The outbox pattern solves the *atomicity between write and publish* problem; it explicitly does not solve exactly-once delivery, because nothing solves exactly-once delivery for free.

## Cleaning Up

The outbox table grows forever if nothing prunes it. Once a connector confirms an event was durably delivered to the broker, not just read from the database but actually acknowledged, the row can be deleted or archived. A common mistake is deleting rows the moment they're read by the poller, before confirming broker delivery — that reintroduces the exact gap the pattern exists to close, just moved one step downstream.

## When It's Worth It

The outbox pattern earns its place any time a service needs "update my database and notify the world" to be atomic — order confirmation, payment state changes, anything a saga's next step depends on. For infrequent, non-critical notifications where an occasional missed event is a shrug, direct publish-after-commit with a retry is simpler and the outbox's guarantees aren't worth the extra table and connector.

## A worked example

In the same Postgres transaction: insert order, insert `outbox` row with payload. A poller (or logical replication) publishes to Kafka and marks sent. Consumers are idempotent. You never `INSERT` then `http.post` in the app.

A test with Testcontainers: commit, poller runs, topic receives one message; crash before mark still retries without double insert of the order.

## Failure modes

Outbox in a different DB. Poller without `FOR UPDATE SKIP LOCKED`. Giant payloads. Never deleting old outbox rows. Publishing before commit. Multiple pollers duplicating without idempotent keys. JSON that cannot deserialize after schema change.

Using the outbox as a query model.

## When this is the wrong tool

If there is no message broker, just commit the row. Dual-write to two DBs is not fixed by an outbox in one of them unless the poller writes the second — then you still have a pipeline. CDC from WAL can replace a custom outbox for some stacks. For in-process events, Spring's transactional event listener may suffice. Do not outbox a high-frequency tick; batch or skip.
