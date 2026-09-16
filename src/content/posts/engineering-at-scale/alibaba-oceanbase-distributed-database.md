---
title: "OceanBase: Alibaba's Distributed Database Built for a Night That Looks Like a DDoS"
slug: "alibaba-oceanbase-distributed-database"
description: "How Alibaba and Ant Group built OceanBase as a Paxos-replicated, shared-nothing SQL system that had to survive Singles' Day traffic without a single primary as the bottleneck."
publishedAt: "2026-12-04"
updatedAt: "2026-12-04"
category: "Alibaba"
tags:
  - Engineering at Scale
  - Alibaba
  - Databases
  - Distributed Systems
sources:
  - title: "OceanBase"
    publisher: "OceanBase"
    url: "https://www.oceanbase.com"
  - title: "Alibaba Cloud OceanBase"
    publisher: "Alibaba Cloud"
    url: "https://www.alibabacloud.com/product/oceanbase"
---

Singles' Day (Double 11) is a planned traffic spike that would be an incident anywhere else. Alibaba's payment and commerce stacks could not scale by buying a bigger Oracle box forever. OceanBase began inside Alibaba/Ant as a distributed relational database: shared-nothing nodes, data partitioned into tablets or partitions, and consensus (Paxos-family) to elect leaders per partition so a node death does not mean a human failover of a single primary. The design target was SQL that operations already knew, with a scale-out story those operations did not have.

## Partitions, leaders, and SQL without a magic bus

OceanBase's architecture, as described in their technical materials, keeps multiple replicas of a partition and uses consensus so commits are durable on a quorum. Leaders serve writes; followers can serve some reads depending on settings. That is the Cockroach/Spanner-shaped idea implemented in a stack that had to migrate from commercial databases with stored procedures, strict constraints, and operational habits around Oracle. Compatibility was not a side quest. It was how you move a bank-like workload.

LSM-style storage and compaction appear in OceanBase's engine story because write-heavy shopping nights would punish a B-tree-only design. Compaction during the peak is an operational choice: you either pay write amplification now or query latency later.

## Multi-region and the shopping night

Geo distribution for disaster recovery is a different problem than packing a region for 11/11. OceanBase deployments talk about primary/secondary clusters and synchronization that can be tuned. The product decision is RPO: how much money-shaped data you can lose if a region burns. Payments want tiny RPO. That costs round trips.

Online schema change and load balancing of partitions matter because the day after Singles' Day you still have to alter a table. A distributed SQL database that requires a maintenance window for every DDL will not ship commerce features.

## Failure modes of NewSQL on shopping peaks

The concrete failure is a hot partition: a flash SKU or a popular shop whose key hashes to one tablet, so 10% of the fleet is idle and one leader is on fire. Mid-size steal: key design that includes a random suffix or a well-known hotspot splitter, and metrics per partition, not only per cluster.

Operational gotcha: followers used for reads with a stale replica during checkout. A user sees stock; the leader disagrees. Use strong reads for inventory mutations. Another is compaction debt after a peak; the cluster "survived" and then died on Sunday morning. Schedule and throttle. Migration from Oracle that keeps a dual-write period without a cutover test will run two sources of truth. Practice the switch. Paxos groups that share a disk with logging from another tenant will jitter elections. Isolate. If you are not Alibaba, you might still steal the idea of partition-level consensus and per-partition alerting. You should not steal a Singles' Day capacity plan as a weekend project. Load-test with skewed keys. Uniform random is a lie. Cross-region leases during a payment also need a timeout story the cashier can read; a hung Paxos group that never surfaces as "pending" will generate duplicate clicks and duplicate posts.

## What you can borrow

- Shard with consensus per partition so failover is not a single primary.
- Watch hot tablets as a first-class SLO; global QPS will hide them.
- Use strong reads for stock and money; eventual followers are for less critical pages.
- Plan compaction and DDL around peaks; surviving the spike is not the end of the incident.
