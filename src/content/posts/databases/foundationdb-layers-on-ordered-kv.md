---
title: "FoundationDB: An Ordered Key-Value Store That Expects You to Build the Database"
slug: "foundationdb-layers-on-ordered-kv"
description: "The layer model: a strictly serializable ordered map, transactions via the sequencer, and why Record Layer and Document Layer exist."
publishedAt: "2026-08-06"
category: "Databases"
tags:
  - Databases
  - FoundationDB
  - Transactions
  - Key-Value
sources:
  - title: "FoundationDB: A Distributed Unbundled Transactional Key Value Store"
    author: "Jingyu Zhou et al."
    publisher: "SIGMOD 2021"
    url: "https://www.foundationdb.org/files/fdb-paper.pdf"
  - title: "FoundationDB Record Layer"
    publisher: "Apple / FoundationDB"
    url: "https://github.com/FoundationDB/fdb-record-layer"
---

FoundationDB is not trying to be Postgres. The core is a **strictly serializable, ordered key-value** store with ACID transactions that may touch multiple keys. SQL, documents, and queues are **layers**: applications or libraries that encode richer models into keys and values. Apple's Record Layer is the existence proof that this split can support production systems (CloudKit) without putting SQL into the storage engine.

## Unbundled: logs, storage, and a sequencer

The SIGMOD 2021 paper describes an architecture where transaction logs, storage servers, and a **sequencer** (or transaction system) are separate roles. Reads go to storage replicas with MVCC. Writes buffer in the client until commit, then conflict ranges are checked against the committed version. The ordered keyspace means a layer can implement indexes as additional keys (`idx/email/foo → pk`) in the **same transaction** as the row, so secondary indexes do not silently diverge.

```text
/app/user/42          → protobuf
/app/idx/email/a@x    → 42
commit: both keys or neither
```

Key design is the whole product. A bad prefix layout creates hot shards (FoundationDB partitions by key ranges). A good layout colocates what transactions touch. Layers that ignore locality recreate the cross-range transaction tax.

## What layers owe you

A layer must encode schema, evolution, and query patterns. There is no planner. If you need a range scan of "all orders for customer C in January," you laid keys as `/orders/C/2026-01-…` or you scan too much. The Record Layer adds record types, indexes, and query planning on top of FDB's map. Skipping a battle-tested layer to "just put JSON in values" works until you need two indexes and a migration.

Transactions have size and duration limits. FoundationDB is not for holding a transaction open while you call a third-party HTTP API. Do the external work first, then commit a small, retryable transaction. Contention on a single key (a counter, a uniqueness lock) serializes; layers often shard counters.

## Operational character

FDB recovers by copying data from logs to storage; the simulation testing culture is famous for a reason. You still need to think about replica placement, backup (and whether backup is consistent), and multi-region. Multi-region FDB is a different design problem than a single cluster.

Choose FoundationDB when you want **serializable multi-key updates** without SQL, and you are willing to own the data model. Choose a SQL database when ad-hoc query and a planner are the product. The layer idea fails when teams each invent incompatible encodings in one cluster.

Read the SIGMOD paper's unbundling diagram, then sketch your keys on paper including every index. If that sketch has a hotspot prefix or a transaction that spans "the entire tenant," you are not done. The KV is simple. The layer is the database.
