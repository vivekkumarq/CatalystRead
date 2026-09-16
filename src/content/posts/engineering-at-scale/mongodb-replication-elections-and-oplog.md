---
title: "MongoDB Replica Sets: Elections, the Oplog, and What 'Primary' Actually Means"
slug: "mongodb-replication-elections-and-oplog"
description: "How MongoDB replica sets elect a primary, copy operations through the oplog, and expose write concern as a durability choice rather than a default you ignore."
publishedAt: "2026-12-16"
updatedAt: "2026-12-16"
category: "MongoDB"
tags:
  - Engineering at Scale
  - MongoDB
  - Databases
  - Distributed Systems
sources:
  - title: "Replica Set Elections"
    publisher: "MongoDB"
    url: "https://www.mongodb.com/docs/manual/core/replica-set-elections/"
  - title: "Oplog"
    publisher: "MongoDB"
    url: "https://www.mongodb.com/docs/manual/core/replica-set-oplog/"
---

A MongoDB replica set is a group of nodes that agree on one primary for writes. Secondaries tail an oplog — a capped collection of operations — and apply them. If the primary dies, remaining nodes vote using Raft-inspired elections (in modern versions) to pick a new primary. That sentence is the happy path. The engineering is write concern, read preference, oplog window, and the fact that a rollback can throw away writes that were acknowledged too weakly.

## The oplog is the replication API

Operations land on the primary's oplog, then secondaries. The oplog is sized: if a secondary falls behind past the window, it cannot catch up incrementally and needs an initial sync (expensive, slow, disk-heavy). Initial sync during a peak is an incident. Hidden and delayed secondaries exist for reporting and "oops" recovery; delayed secondaries cannot save you from a drop that is older than the delay.

Elections consider priority, freshness (who has the newest oplog), and connectivity. A node in a bad network partition should not win. Majority write concern exists so a write is on a majority of voting members before the client continues — which is how you avoid acknowledging a write that rollback will eat. `w:1` is fast and is a cache with extra steps if you care about the document.

## Reads, sessions, and causality

Read preference `secondary` will return stale data. For many apps that is fine. For "read your write" after a form post, it is a bug. Causal consistency sessions in MongoDB exist to make a sequence of reads and writes hang together without always hitting the primary for everything. Ignoring this and spraying reads to secondaries globally is how users bounce between seeing a document and not.

Change streams also read the oplog (or more precisely, the deployment's change feed built on it). An oplog gap is a change-stream gap.

## Failure modes of replica sets

The concrete failure is acknowledging `w:1`, failing over, rolling back the write, and still having sent the user a confirmation email. Mid-size steal: majority writes for money and email side effects, and idempotent consumers.

Operational gotcha: a 2-node replica set (or 3 nodes with one always down) that cannot form a majority, so elections fail and the set is read-only. Use 3 voting members across failure domains, or a tiebreaker. Another is an undersized oplog on a bursty write workload. Watch `replication lag` and oplog window hours. Index builds and large multi-updates will lag secondaries; schedule them. If you shard, each shard is a replica set. You have multiplied elections. Connection strings must include multiple hosts; a single hostname to the old primary is a latent outage. Test stepDown. Application retryable writes help, but they are not a substitute for write concern. Steal the oplog idea: an ordered operations log is how you clone a data store. Size it for your worst catch-up, not the average afternoon.

## What you can borrow

- Set write concern to majority for any write with an external side effect.
- Size the replication log for the worst lag you will actually survive, and alert on window.
- Use three voting members across zones; two-node sets are a split-brain or stall waiting to happen.
- Treat secondary reads as stale unless you have a causal session.
