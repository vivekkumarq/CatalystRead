---
title: "ksqlDB: Stream Processing That Looks Like SQL Until the Watermark"
slug: "confluent-ksqldb-stream-processing-sql"
description: "How Confluent's ksqlDB turned Kafka topics into tables and streams you can query with SQL, and why event-time windows still leak through the syntax."
publishedAt: "2026-12-20"
updatedAt: "2026-12-20"
category: "Confluent"
tags:
  - Engineering at Scale
  - Confluent
  - Stream Processing
  - Apache Kafka
sources:
  - title: "ksqlDB"
    publisher: "Confluent"
    url: "https://docs.ksqldb.io"
  - title: "Kafka Streams"
    publisher: "Apache Kafka"
    url: "https://kafka.apache.org/documentation/streams/"
---

Confluent's ksqlDB sits on Kafka Streams: a SQL layer that declares persistent queries — `CREATE STREAM`, `CREATE TABLE`, joins, windowed aggregations — and runs them as distributed stream processors that read and write topics. The pitch is that a data engineer can maintain a pipeline without compiling a Flink job. The reality is that SQL hides state stores, repartition topics, and watermarks until something is late, skewed, or reprocessed. Used well, ksqlDB is a fast path from topic to derived topic. Used as "Postgres on Kafka," it is a disappointment.

## Streams vs tables

A stream is unbounded events. A table is the latest value per key (a changelog). That duality is Kafka Streams' core, and ksqlDB exposes it. `SELECT` from a table looks like a lookup; it is a materialized state store backed by a changelog topic. Restarts rebuild from the changelog (or from snapshots, depending on config). If you treat a table as a database without a compaction policy, the changelog grows without bound.

Joins require co-partitioning. If two streams do not share the same key and partition count, ksqlDB will repartition — extra topics, extra latency. Windowed joins need grace periods. Late data after grace is dropped or sent to a dead letter, not magically included.

## Persistent queries are jobs

A ksqlDB query is a long-running job with capacity, lag, and a failure mode. Pull queries (interactive lookups against a table) hit the node that owns the key; they are not a cluster-wide SQL warehouse. Push queries stream results. Mixing them without understanding locality produces hot nodes.

Exactly-once (EOS) processing is available in the Kafka Streams sense: it is not cheaper. Idempotent sinks and transactional produces have a cost. At-least-once plus idempotent writes is often the grown-up default.

## Failure modes of SQL-on-streams

The concrete failure is a `GROUP BY` without a window on a high-cardinality key, so state is unbounded and disks fill. Mid-size steal: always window or expire, and cap unique keys.

Operational gotcha: schema changes on the source topic that ksqlDB does not evolve, so the query poisons itself and falls behind. Pair with Schema Registry and a compatibility policy. Another is running ksqlDB as a single server for "simplicity" and losing all pull-query availability. It is a cluster. Reprocessing from earliest will duplicate side effects if the sink is not idempotent. Late-arriving events after a watermark will silently skip; measure dropped-late metrics. If you needed batch correctness, a warehouse job may be simpler than window gymnastics. Steal Kafka Streams' table/stream split even if you write Java. Do not steal ksqlDB as a replacement for ClickHouse. Different questions: "what is the latest status of this order" vs "p95 of all orders last quarter." Capacity-plan the internal topics; they are not free. Name persistent queries like production services, with owners and SLOs on lag. A SQL string in a wiki with no pager is still a job that can take down a downstream table used as a cache. When you change a query, treat it as a cutover: new output topic, dual-run, then switch consumers, because in-place rebuilds will replay side effects.

## What you can borrow

- Model changelog tables and event streams as different things, even under SQL syntax.
- Co-partition join keys; treat repartition as a cost you can see in the topic list.
- Bound state with windows or retention; high-cardinality GROUP BY is a disk bomb.
- Version schemas and make sinks idempotent before you enable replay.
