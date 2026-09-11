---
title: "MyRocks: How Facebook Cut MySQL Storage Nearly in Half"
slug: "meta-myrocks-lsm-engine-replacing-innodb"
description: "Why Facebook replaced InnoDB with MyRocks, an LSM-tree storage engine built on RocksDB, to shrink storage footprint across its huge MySQL fleet."
publishedAt: "2026-06-04"
category: "Meta"
tags:
  - Engineering at Scale
  - Meta
  - Databases
  - Storage
sources:
  - title: "MyRocks: A space- and write-optimized MySQL database"
    publisher: "Facebook Engineering"
    url: "https://engineering.fb.com"
---

Facebook has long run one of the largest MySQL deployments in the world, and at that scale, storage efficiency isn't a nice-to-have — every percentage point of storage overhead multiplies across an enormous fleet into real hardware cost and real operational burden. InnoDB, MySQL's default storage engine, uses a B-tree structure that's well suited to general-purpose read-write workloads but carries overhead — page fragmentation, the space consumed by indexes, and write amplification from in-place updates — that becomes expensive precisely at Facebook's scale, where the workloads in question (like storing social graph data via TAO's persistence layer) are heavily write-oriented and enormous in aggregate size.

## Why B-trees weren't the best fit

InnoDB's B-tree structure updates data in place, which is intuitive and works well for general-purpose OLTP workloads, but it has a structural cost: pages don't stay perfectly full as data changes, leaving fragmentation that wastes disk space, and every write can trigger cascading page splits and rewrites. For read-heavy, low-write-volume workloads, this trade-off is usually fine. Facebook's actual internal workload — driven substantially by the write-heavy nature of storing and updating social graph edges — sat in a different part of that trade-off space, where the fragmentation and write amplification costs of a B-tree were adding up across a very large deployment.

## LSM-trees trade write amplification for compaction

Facebook's answer was MyRocks: a MySQL storage engine built on top of RocksDB, an embedded key-value store Facebook had already built using a log-structured merge-tree (LSM-tree) design. Instead of updating data in place, an LSM-tree writes changes sequentially to an in-memory structure that's periodically flushed to disk as an immutable sorted file, with a background compaction process later merging and reorganizing those files to keep read performance reasonable and reclaim space from overwritten or deleted data. This trades some of B-tree's in-place-update simplicity for sequential writes (generally cheaper, especially historically on spinning disks, and still favorable on flash for sustained write throughput) and much better data compression, since sorted, immutable files compress more effectively than a live, constantly mutated B-tree structure.

## The payoff: roughly half the storage footprint

Facebook's engineering write-ups on MyRocks reported storage space savings on the order of half compared to InnoDB for their workloads, primarily driven by better compression ratios achievable on LSM-tree's immutable sorted files plus reduced fragmentation overhead. At fleet scale, that kind of reduction translates directly into fewer machines needed to store the same data, which is a meaningful capital and operational expense saved, not just a storage-efficiency curiosity. The trade-off Facebook accepted was added complexity in tuning compaction (which consumes background I/O and CPU) and some workload-dependent shifts in read and write latency characteristics compared to InnoDB.

## What you can borrow

- Match your storage engine to your actual read/write ratio and update pattern — a general-purpose default (like a B-tree engine) can carry real, quantifiable overhead if your workload sits far from what it was optimized for.
- LSM-tree engines tend to win on write-heavy workloads and storage efficiency via compression, at the cost of compaction overhead and more operational tuning — that trade is worth it at scale, but adds real complexity smaller systems may not want to take on.
- Storage savings that look modest per-instance compound dramatically across a large fleet; it's worth periodically re-evaluating engine choices that were made when the fleet, and the cost of overhead, was much smaller.
- Building this kind of change on an already-proven internal component (RocksDB) rather than starting from scratch reduces the risk of a storage-engine migration, which is about as high-stakes a change as a database can undergo.
