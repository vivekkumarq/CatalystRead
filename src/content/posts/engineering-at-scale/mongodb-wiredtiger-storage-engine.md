---
title: "WiredTiger: The Storage Engine That Made MongoDB's Document Model Fast Enough"
slug: "mongodb-wiredtiger-storage-engine"
description: "How MongoDB's WiredTiger engine brought document-level concurrency, compression, and checkpointing — replacing MMAPv1's collection-level locks."
publishedAt: "2026-12-17"
updatedAt: "2026-12-17"
category: "MongoDB"
tags:
  - Engineering at Scale
  - MongoDB
  - Databases
  - Storage
sources:
  - title: "WiredTiger Storage Engine"
    publisher: "MongoDB"
    url: "https://www.mongodb.com/docs/manual/core/wiredtiger/"
  - title: "WiredTiger"
    publisher: "MongoDB"
    url: "https://source.wiredtiger.com"
---

MongoDB's early MMAPv1 engine mapped files and took collection-level (and earlier, global) write locks that became famous for the wrong reasons. WiredTiger, acquired and then made the default, is an MVCC storage engine with document-level concurrency, prefix compression, and checkpoints. The document model did not change. The ability for two updates to different documents in the same collection to proceed without a collection lock did. That is the difference between a JSON store as a prototype and a JSON store as a fleet.

## MVCC, snapshots, and cache

WiredTiger keeps a cache of pages in process memory (separate from the OS page cache story, though they interact). Readers see a snapshot; writers do not block all readers. History (in newer versions, a history store) supports longer reads and snapshot isolation behaviors. Cache pressure is the operational center: if the working set does not fit, you evict, you checkpoint, you stall. The famous "WiredTiger dirty eviction" graphs are how MongoDB on-call lives.

Compression (snappy, zstd) trades CPU for disk. For many document workloads it is a win. For tiny, already-random documents it can be a wash. Indexes have their own compression. The engine also supports encryption at rest as a layer — another CPU tax you should measure.

## Checkpoints vs the journal

WiredTiger journals for durability between checkpoints. A crash recovers from the last checkpoint plus journal. Tuning checkpoint frequency is a latency vs recovery-time choice. The old MMAPv1 journaling folklore does not apply; operators who copy `syncPeriod` myths from 2013 will mis-tune.

Document-level locking still does not save you from a hot document. A counter in a single document is a single document. The engine cannot invent extra concurrency inside one `_id`.

## Failure modes of WiredTiger in production

The concrete failure is a cache that is too large relative to RAM (leaving nothing for the OS) or too small for the working set, so eviction storms freeze writes. Mid-size steal: follow current MongoDB cache sizing defaults, watch eviction metrics, and do not host a huge WT cache on a tiny VM because "MongoDB uses memory."

Operational gotcha: an unbounded array in a document that grows forever (a pattern MMAPv1 also hated). WiredTiger still has to rewrite. Another is creating too many collections/indexes, each with WT handles and metadata overhead. Checkpoints during a huge index build will look like a hang. Disk: using network filesystems that lie about fsync is how you corrupt. Local NVMe is the intended world. If you migrate from MMAPv1, test; padding and document growth behavior changed. Steal MVCC as an idea: readers should not take write locks. Do not steal a 90% cache fill as "efficient." Leave headroom. Compact and idle connections are not a substitute for right-sizing documents. Measure `pages evicted` and application p99 together; they are often the same graph. Sessions that hold a snapshot while a user reads a 200-page result set will pin history and blow the cache for everyone else; cap cursors and idle session lifetime. Snapshot too long is a storage-engine incident that looks like "Mongo is slow."

## What you can borrow

- Prefer row/document-level concurrency over collection-wide locks when the workload is many small objects.
- Size the engine cache as a first-class capacity plan, with eviction alerts.
- Do not model hot counters as a single growing document.
- Trust fsync on real local disks; storage that lies will outsmart your journal.
