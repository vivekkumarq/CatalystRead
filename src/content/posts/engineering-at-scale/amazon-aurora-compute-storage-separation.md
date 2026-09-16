---
title: "Aurora: What Happens When You Rebuild the Database Around the Log"
slug: "amazon-aurora-compute-storage-separation"
description: "How Amazon Aurora separates database compute from a purpose-built, log-structured distributed storage layer to cut replication network traffic."
publishedAt: "2026-04-14"
updatedAt: "2026-09-16"
category: "Amazon"
tags:
  - Engineering at Scale
  - Amazon
  - Databases
  - Cloud Architecture
---

Traditional relational databases, including standard MySQL and PostgreSQL, replicate by shipping whole data pages or physical changes across the network to replicas, and every write typically has to be durably persisted at multiple layers — the redo log, the data file, and often a separate replication stream — before it's considered safe. In a cloud environment with network-attached storage, that adds up to a lot of network I/O for every single write, and it was the specific bottleneck Amazon Aurora's architects set out to eliminate, as described in the 2017 SIGMOD paper "Amazon Aurora: Design Considerations for High Throughput Cloud-Native Relational Databases."

## Ship only the log, not the pages

Aurora's core architectural move is separating the database engine (compute) from a purpose-built, distributed, log-structured storage layer, and having the database engine ship only the redo log records over the network — not full data pages, and not a separately maintained replication stream. The storage layer itself is responsible for applying those log records to reconstruct data pages as needed, asynchronously and in the background, rather than the database engine doing that work and then shipping the result across the network.

This inverts where the "expensive" work happens compared to a traditional setup: instead of the compute layer doing page management and then paying a network cost to replicate the result, the network cost is paid once, for a much smaller log record, and page reconstruction becomes the storage layer's job, done locally where the data already lives. Because redo log records are far smaller than the full pages they eventually produce, this cuts the network traffic generated per write substantially compared to conventional replication approaches.

## Quorum writes across three availability zones

Aurora's storage layer replicates data six ways across three availability zones, two copies per zone, and uses a quorum model for reads and writes rather than requiring every replica to acknowledge a write before it's considered durable. A write is considered durable once a quorum of the six storage nodes has acknowledged it, and reads similarly only need a quorum, which lets Aurora tolerate the loss of an entire availability zone plus an additional node failure without losing durability or availability — a guarantee that would be considerably more expensive to achieve if every write had to be synchronously confirmed by every single replica before proceeding.

## Fewer moving parts to keep synchronized

A subtler benefit of the design is fewer redundant durability mechanisms to keep consistent with each other. In a traditional replicated database setup, you're often maintaining a redo log, a binary replication log, and physical data files, and keeping all of them mutually consistent under failure scenarios is itself a source of complexity and bugs. Aurora's storage layer collapses much of that down to essentially one thing — the distributed log — which both simplifies the failure and recovery story and speeds up crash recovery: instead of replaying a redo log against data files at engine startup the way a traditional database does, Aurora's storage layer handles redo application continuously and in the background, so a crashed database engine can come back online and be usable almost immediately.

Aurora presents this storage layer under database engines that are wire-compatible with standard MySQL and PostgreSQL, so applications built against those engines don't need rewriting to take advantage of the underlying architectural change — the rearchitecture is invisible above the storage boundary.

## What broke when they scaled

Classic MySQL replication shipped pages and binlogs until network and fsync amplified every commit. Aurora's 2017 SIGMOD paper ("Amazon Aurora: Design Considerations for High Throughput Cloud-Native Relational Databases") and the later 2018 paper on quiesced redo application describe how moving redo to a multi-AZ storage fleet changes failure modes. Compute can die and attach elsewhere because the log is the source of truth — but the storage quorum now *is* the database. A correlated storage fault, or a bug in log application, is existential in a way a local disk was not.

Tail latency at the storage quorum becomes the commit path. Six copies across three AZs with a write quorum means you wait on the slower of the successful votes, not on the slowest disk in the universe — unless many nodes are slow together. Aurora's work on avoiding gossipy recovery and on segmenting storage is about keeping that tail in check as volumes grow to many terabytes.

Engine compatibility is a product constraint that bites: MySQL/Postgres features that assume local files, superuser filesystem access, or certain replication plugins do not map cleanly. Customers who needed those edges stayed on RDS instance storage. Fast crash recovery also changes how you think about "reboot the box" as a mitigation — it is cheaper, so you must be sure you are not masking storage-layer pain.

## A smaller-team version of the same idea

Separate a database process from durable storage you already trust (EBS, a network disk) and treat the WAL as sacred: replicate the log, not ad-hoc copies of data directories. Use a managed Aurora-like service if you want the quorum design without building it. If you run Postgres yourself, synchronous replica in another AZ plus WAL archiving is the small-team cousin — slower than Aurora's custom storage, much simpler than inventing a log-structured multi-AZ engine.

## What you can borrow

- Identify the smallest unit of information that actually needs to cross an expensive boundary — Aurora ships log records, not pages, because the log is what's actually necessary to reconstruct state.
- Quorum-based durability, rather than requiring universal acknowledgment, can dramatically cut write latency while still tolerating real failure scenarios.
- Fewer independent durability mechanisms that all need to stay consistent with each other means fewer subtle bugs and faster recovery.
- A significant internal rearchitecture can still be delivered as a drop-in replacement if you preserve the interface your callers depend on.
