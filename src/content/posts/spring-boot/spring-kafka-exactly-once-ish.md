---
title: "Spring Kafka and Exactly-Once-ish: Transactions, EOS, and the Remaining Gaps"
slug: "spring-kafka-exactly-once-ish"
description: "read-process-write with Kafka transactions, idempotent producers, and why 'exactly once' still stops at the database unless you join the TX."
publishedAt: "2026-09-07"
category: "Spring Boot"
tags:
  - Spring Boot
  - Kafka
  - Messaging
  - Transactions
sources:
  - title: "Spring for Apache Kafka reference: transactions"
    publisher: "Spring"
    url: "https://docs.spring.io/spring-kafka/reference/kafka/exactly-once.html"
  - title: "KIP-98: Exactly Once Delivery and Transactional Messaging"
    publisher: "Apache Kafka"
    url: "https://cwiki.apache.org/confluence/display/KAFKA/KIP-98+-+Exactly+Once+Delivery+and+Transactional+Messaging"
---

Kafka's transactional API (KIP-98) lets a producer write to **several partitions atomically** and, with `isolation.level=read_committed`, lets consumers skip aborted transactions. Spring Kafka exposes this via `KafkaTransactionManager`, `@Transactional` on a listener, and `transactionIdPrefix`. That is **exactly-once between Kafka topics** in the happy configuration. It is not exactly-once from Kafka into Postgres unless the database work is in the same atomic story — which it usually is not.

## What EOS actually covers

Idempotent producers (`enable.idempotence=true`) already prevent duplicates on retry to the same partition for a given producer session. Transactions add a transaction id, sequence, and markers so a consumer in `read_committed` will not see messages from an aborted txn. A Spring `@KafkaListener` that only publishes to another topic can use `kafkaTemplate.executeInTransaction` or a chained transactional listener container so consume-offset and produce commit together (consume-transform-produce).

```java
@Transactional
@KafkaListener(topics = "orders")
public void on(Order o) {
  kafkaTemplate.send("orders-enriched", enrich(o));
}
```

With the right `KafkaTransactionManager` and after-rollback rules, a failure aborts the produced records. Duplicate **listener** invocations after a rebalance still happen; your handler must be safe if the transaction aborted before commit.

## The database is the plot hole

If you `repository.save()` and then `kafkaTemplate.send()`, you have two systems. Outbox pattern: write the row and the outbox in one JDBC transaction, then a publisher emits to Kafka. Kafka transactions do not include JDBC. XA exists and is a different operational tax. "We turned on EOS" does not make a dual-write disappear.

`read_committed` consumers will lag slightly (they wait for txn markers). `read_uncommitted` (default in some clients historically) can see aborted data — do not mix isolation in the same pipeline without naming it.

## Spring knobs that bite

`transactionIdPrefix` must be unique per **instance** of a transactional producer, stable across restarts for fencing, and not collide in a Kubernetes replica set. Too-short transaction timeouts abort under GC. `MAX_POLL_INTERVAL` versus transaction duration: if processing exceeds poll interval, the consumer is kicked, the txn aborts, another instance retries — design for that.

Exactly-once is a spectrum. Name the endpoints: Kafka-to-Kafka, Kafka-to-DB, DB-to-Kafka. Spring can help the first. The others need outbox, idempotent consumers (`ExactlyOnce` is not a substitute for an idempotency key on the message).

Read Spring's exactly-once chapter and KIP-98's guarantees. Then trace one message into the DB with a unique key. If a crash can insert twice, you were never exactly-once, you were transactional on the broker only.
