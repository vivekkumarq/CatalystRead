---
title: "Serializable SQL on a KV Layer: How CockroachDB Makes Transactions Look Like Postgres"
slug: "cockroachdb-serializable-sql-on-kv"
description: "How CockroachDB implements SQL — including serializable transactions — on a distributed key-value map, and why contention shows up as retries instead of silent anomalies."
publishedAt: "2026-12-11"
updatedAt: "2026-12-11"
category: "CockroachDB"
tags:
  - Engineering at Scale
  - CockroachDB
  - Databases
  - Distributed Systems
sources:
  - title: "SQL Layer"
    publisher: "Cockroach Labs"
    url: "https://www.cockroachlabs.com/docs/stable/architecture/sql-layer.html"
  - title: "Transaction layer"
    publisher: "Cockroach Labs"
    url: "https://www.cockroachlabs.com/docs/stable/architecture/transaction-layer.html"
---

CockroachDB speaks PostgreSQL wire protocol so applications can use familiar SQL. Underneath, rows are keys and values in a sorted, replicated map. Indexes are more keys. A SQL transaction that touches two rows in different ranges is a distributed transaction: intents, a transaction record, and a commit protocol that preserves serializable isolation rather than the "read committed and hope" that many distributed stores offered. That is the ambitious part. The operational part is that serializable means some transactions abort, and your app must retry.

## From optimizer to MVCC keys

The SQL layer plans a query, then the execution engine reads and writes KV keys with MVCC timestamps. A secondary index lookup is not a pointer chase inside a heap file; it is more KV gets, which can hop to other ranges. This is why ORM chatty patterns that were "fine" on a single Postgres become a latency tax. Batching and covering indexes matter more.

Writes leave write intents. Conflicts with other intents cause waits or restarts. The isolation level is serializable by default: you should not see write skew that would pass on snapshot isolation. The cost is more retries under contention, which is the correct failure mode if the alternative is an incorrect balance.

## Parallel commits and the wish for one RTT

Cockroach has invested in reducing commit round trips (parallel commits, pipelining) because a transaction that waits for Raft on every write in series is death in a multi-region deployment. The KV layer's job is to make the common case of a small, well-keyed transaction cheap, and the uncommon case of a huge multi-range update correct. If you update a million rows in one SQL transaction, you have built a distributed locking saga whether you meant to or not.

Schema metadata is also KV. The leased descriptors and the optimizer's view of tables have to stay coherent during online schema change. That is a transaction system for the catalog, not only for user rows.

## Failure modes of SQL-on-KV

The concrete failure is a transaction that reads a row, thinks, then writes, spanning seconds, while others update the same keys — retry loops that look like a hang. Mid-size steal: keep transactions short, touch a locality-friendly key set, and implement idempotent retries.

Operational gotcha: `SELECT FOR UPDATE` patterns copied from Postgres that contend worse because the rows hash across the world. Another is unique indexes on globally incrementing values. UPSERT storms on the same key are a queue. If you need queue semantics, use a different shape. Explain analyze and contention dashboards are how you debug; logs that only say "restart" are not enough. Clock uncertainty in distributed MVCC can add latency; do not turn off protections to "make it fast." Applications that swallow serialization errors and skip the write will desynchronize from the database they thought was the source of truth. Treat 40001-class errors as retry. If you wanted read-committed anomalies for performance, Cockroach has moved toward more isolation options in later versions — know which level you are on. Steal the mental model: every SQL feature is extra keys. Ask what keys a query touches.

## What you can borrow

- Map SQL to KV explicitly in design reviews: which keys, which ranges, which indexes.
- Default to serializable and retry; do not hide aborts.
- Keep transactions short and keyed for locality.
- Profile contention; "slow SQL" is often a hot key, not an unindexed table in the classic sense.
