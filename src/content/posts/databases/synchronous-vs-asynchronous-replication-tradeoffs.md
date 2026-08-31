---
title: "Synchronous vs Asynchronous Replication: The Real Trade-offs"
slug: "synchronous-vs-asynchronous-replication-tradeoffs"
description: "What synchronous and asynchronous replication actually guarantee during a failover, and why the choice is really about how much data you can lose."
publishedAt: "2024-12-18"
category: "Databases"
tags:
  - Databases
  - Replication
  - Distributed Systems
  - PostgreSQL
  - Reliability
---

Replication decisions tend to get made once, early, based on whatever the default was, and then never revisited until a failover actually happens and someone discovers what "replica" meant under the hood. The sync-versus-async choice isn't about throughput as the primary axis — it's about how much committed data you're willing to lose when the primary dies, which is a business question wearing a technical costume.

## What "committed" means changes with the mode

In asynchronous replication, the primary commits a transaction, acknowledges it to the client, and *then* streams the change to replicas whenever it gets around to it. If the primary crashes before a replica catches up, that committed, acknowledged transaction is gone — it exists nowhere else. This is the default in Postgres streaming replication and in most managed database services, precisely because it doesn't add latency to the write path.

In synchronous replication, the primary waits for at least one replica to confirm it has received (and, depending on configuration, applied) the transaction before acknowledging the commit to the client. Lose the primary, and the data you were told was committed is guaranteed to exist on at least one other node.

```sql
-- postgresql.conf on the primary
synchronous_standby_names = 'ANY 1 (replica_a, replica_b)'
synchronous_commit = on
```

`synchronous_commit` also has intermediate settings worth knowing: `remote_write` waits for the replica to receive and write the data to its OS but not necessarily fsync it, while `local` only waits for the local WAL flush and behaves like async for replication purposes. These knobs exist because "synchronous" isn't binary — it's a spectrum of exactly what durability guarantee you're paying latency for.

## The latency tax is real and compounding

Synchronous replication means every commit waits for a network round-trip to the replica, plus whatever fsync cost the replica incurs. If the replica is in the same availability zone, that might add single-digit milliseconds. If it's cross-region for disaster-recovery purposes, it can add tens to low hundreds of milliseconds — applied to every single write transaction, not just the slow ones. This is why most systems that use synchronous replication for durability keep the synchronous replica close (same region, different AZ) and use asynchronous replication for the geographically distant disaster-recovery copy, layering the two rather than picking one globally.

## The failure mode nobody plans for

The dangerous edge case with synchronous replication is what happens when the synchronous replica itself becomes unreachable. Depending on configuration, the primary can either block all writes until the replica comes back — turning a single replica outage into a full outage — or silently fall back to asynchronous behavior, which quietly removes the durability guarantee you thought you had without any alarm going off. Postgres's `ANY n (...)` syntax, shown above, mitigates this by requiring acknowledgment from any *n* of a named set rather than one specific node, so a single replica's failure doesn't halt the primary.

## Choosing deliberately

The right question isn't "sync or async" in the abstract, it's: for this specific data, what does losing the last few seconds of writes actually cost if the primary dies right now? For an audit log or financial ledger, that answer is usually "unacceptable," which justifies the latency tax of synchronous replication for at least one nearby replica. For an analytics events table or a cache-adjacent dataset, async is almost always the right default, because the latency savings compound across every write and the data loss window, in practice, rarely gets exercised and rarely matters when it does.
