---
title: "Why DoorDash Moved Critical Transactions onto CockroachDB"
slug: "doordash-cockroachdb-horizontally-scalable-transactions"
description: "DoorDash adopted CockroachDB to get horizontal scalability and strong consistency for order and payment data without the operational pain of manual sharding."
publishedAt: "2025-06-11"
updatedAt: "2026-09-16"
category: "DoorDash"
tags:
  - Engineering at Scale
  - DoorDash
  - Databases
  - Distributed Systems
---

Order and payment data sits at the center of a delivery marketplace, and it comes with a hard requirement that's easy to state and hard to satisfy at scale: transactions need to be strongly consistent, because double-charging a customer or losing track of an order state is a trust-breaking failure, not a minor bug. DoorDash grew fast enough that its traditional relational database setup — a primary instance handling writes, with the usual read replica and manual sharding tricks layered on top as load grew — started to strain under both write volume and the operational overhead of managing that sharding by hand. The company's response was to adopt CockroachDB, a distributed SQL database designed to scale horizontally while still offering the transactional guarantees engineers expect from a traditional relational database.

## The ceiling on vertical scaling and manual sharding

A single-primary relational database can be scaled vertically for a long time — bigger instances, more memory, faster storage — but that approach eventually hits a ceiling, and it doesn't help with write throughput once a single primary is genuinely saturated. The conventional next step, manual application-level sharding, solves throughput but reintroduces the very consistency problems a relational database was chosen to avoid: cross-shard transactions become awkward or impossible, resharding as traffic grows unevenly across shards becomes a recurring, risky operational project, and application code accumulates sharding-aware logic that has nothing to do with the actual business problem.

DoorDash's order and payment path is also a case where "eventually consistent" doesn't cleanly apply — a Dasher accepting a delivery, a payment being captured, and inventory being confirmed at a merchant all need to agree on a consistent view of state, or the platform risks real-world consequences like a driver showing up for an order that was already canceled.

## Distributed SQL as a middle path

CockroachDB's pitch — and the reason it fit DoorDash's problem — is that it distributes data automatically across nodes while still presenting a standard SQL interface with ACID transaction guarantees, using a consensus protocol (Raft) under the hood to keep replicated ranges of data consistent even as nodes fail or get added. Instead of application engineers manually deciding which shard a row lives on, the database handles range distribution and rebalancing itself, and instead of losing transactional guarantees at the shard boundary, transactions that span multiple ranges of data are still handled correctly by the database's own distributed transaction protocol.

```sql
-- looks like ordinary SQL to application code
BEGIN;
UPDATE orders SET status = 'confirmed' WHERE order_id = $1;
INSERT INTO payment_captures (order_id, amount) VALUES ($1, $2);
COMMIT;
-- distribution and consensus happen underneath, invisibly
```

## Migrating a live, revenue-critical path

Moving a system this central to the business meant DoorDash couldn't treat the migration as a big-bang cutover. The path involved running services against the new database incrementally, validating correctness and performance against real traffic patterns before fully committing critical write paths to it, and being deliberate about which services moved first based on how sensitive they were to any transition risk. The payoff was less about a single performance number and more about removing an entire category of future scaling projects — manual resharding — from the roadmap.

## What broke when they scaled

Postgres (or a similar single-primary SQL store) is excellent until write throughput and storage of order/payment rows exceed one machine, or until a regional outage takes the primary with it. Manual sharding — hash of `consumer_id` onto N databases — restores capacity and destroys transactions that cross shards: a Dasher payout that must stay consistent with an order row, a refund that touches payment and order state. DoorDash's engineering writing on CockroachDB adoption emphasizes serializable (or at least strongly consistent) SQL with horizontal scale so those flows did not become sagas by default.

Distributed SQL is not a free lunch. CockroachDB (and Spanner-class systems) pay in commit latency for multi-region consensus and in operational novelty: range hotspots, clock uncertainty, and SQL features that surprise people coming from Postgres. A marketplace lunch rush is a hotspot factory — popular restaurants, a city, a promo code. If the primary key puts that rush on one range, you have a scaled-out database that still acts like one disk. Schema migrations and ORM assumptions from the Django era also break when the database is a cluster.

The migration path for live order traffic is dual-write or shadow reads with extreme care: money and food cannot "eventually" appear.

## A smaller-team version of the same idea

Stay on one Postgres with replicas until you have measured the ceiling. If you must split, shard by a key that never needs cross-shard transactions (by city, by restaurant, not by random UUID). Use Cockroach or a managed Spanner-like service when you need SQL + HA + scale and cannot afford a custom sharding layer. Keep payment-critical rows on the smallest number of ranges you can, with keys that spread load.

## What you can borrow

- Before reaching for eventual consistency to solve a scaling problem, check whether your actual requirement is strong consistency wearing a scaling problem's clothes.
- Manual sharding trades a throughput problem for an operational and correctness problem; a distributed SQL database can remove that trade-off if your workload fits its model.
- Migrate critical, revenue-touching data stores incrementally, service by service, rather than as a single cutover.
- Evaluate new infrastructure against your hardest consistency requirements first, not your average-case query pattern.
