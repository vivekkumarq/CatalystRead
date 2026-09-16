---
title: "CockroachDB: Multi-Active Ranges Instead of a Single Primary in Another ZIP Code"
slug: "cockroachdb-multi-active-availability-ranges"
description: "How CockroachDB splits tables into ranges, replicates them with Raft, and serves from multiple regions without one global write master."
publishedAt: "2026-12-10"
updatedAt: "2026-12-10"
category: "CockroachDB"
tags:
  - Engineering at Scale
  - CockroachDB
  - Distributed Systems
  - Databases
sources:
  - title: "Architecture Overview"
    publisher: "Cockroach Labs"
    url: "https://www.cockroachlabs.com/docs/stable/architecture/overview.html"
  - title: "Multi-region"
    publisher: "Cockroach Labs"
    url: "https://www.cockroachlabs.com/docs/stable/multiregion-overview.html"
---

CockroachDB's pitch against a classic primary/replica RDBMS is geographic and operational: keep SQL, but make the unit of replication a range of keys, each with its own Raft group, so a node loss is not a failover of the entire database. "Multi-active availability" in Cockroach Labs' language means more than one region can serve traffic for the data that lives there, rather than every write flying to a single active primary in Virginia. The details are ranges, leaseholders, and survival goals you must actually choose.

## Ranges are little databases

A table is split into ranges (on the order of 512 MiB by default, splitting and merging as they grow). Each range has replicas, typically three or five, and a Raft leader. The leaseholder — often the leader — serves reads that must be up to date. This is how you scale: add nodes, move replicas, split hot ranges. It is also how you get a hot range: a monotonically increasing key (timestamp-as-PK) that always appends to the last range, so one Raft group takes all writes.

Multi-region tables add locality: regional by row, regional by table, global tables. A `REGIONAL BY ROW` table can keep a user's data near them. Global tables (think: small reference data) use a different replication pattern that is expensive if you pretend a huge table is global. Survival goals (`ZONE` vs `REGION`) change how many failures you can take and how many round trips a commit needs. These are not knobs to max out "for safety" without reading the latency bill.

## Leases, clocks, and moving data

Cockroach uses hybrid-logical clocks and, in newer versions, tighter coordination to keep snapshot isolation sound. Lease transfers and snapshotting of ranges are background operations that can surprise you under load if a rebalance storm coincides with a traffic peak. The cluster is always a bit in motion. Treat rebalancing as production traffic.

Follow-the-workload and locality-aware lease preferences try to put leaseholders near clients. If your app is in three regions but the table is not configured, you still have a long commit.

## Failure modes of range-based SQL

The concrete failure is an index on a high-cardinality column that creates a hotspot, or a secondary index that must be updated in a range far from the row's home. Mid-size steal: check the hot-ranges dashboard before you blame "Raft."

Operational gotcha: `SELECT COUNT(*)` at app startup on a huge table, which fans out to every range. Another is running with replication factor 3 in one AZ and calling it multi-AZ. Replica placement policies must be verified, not assumed. Schema changes in Cockroach are online but not free; a bad index build will compete with production. Multi-region add/remove of regions is a migration, not a checkbox. If you need SERIALIZABLE (the default) and you retry less than you should, you will surface transaction contention errors to users. Client retry loops are part of the architecture. Steal the range idea even on other databases: shard by a key that is not an incrementing ID. Watch range count and rebalance queues like you watch CPU.

## What you can borrow

- Replicate in small key ranges so failover is per shard, not per cluster.
- Design keys and indexes to avoid a single hot range.
- Choose multi-region survival goals with a latency budget, not as a slogan.
- Put retry logic in clients; contention under serializable isolation is expected.
