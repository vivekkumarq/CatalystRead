---
title: "Distributed ClickHouse: How a Query Becomes a Scatter-Gather Across Shards"
slug: "clickhouse-distributed-query-processing"
description: "How ClickHouse Distributed tables send query pieces to shards, merge results on a coordinator, and fail in ways a single-node MergeTree never will."
publishedAt: "2026-12-19"
updatedAt: "2026-12-19"
category: "ClickHouse"
tags:
  - Engineering at Scale
  - ClickHouse
  - Distributed Systems
  - Analytics
sources:
  - title: "Distributed Table Engine"
    publisher: "ClickHouse"
    url: "https://clickhouse.com/docs/en/engines/table-engines/special/distributed"
  - title: "Cluster discovery"
    publisher: "ClickHouse"
    url: "https://clickhouse.com/docs/en/architecture/cluster-deployment"
---

A single ClickHouse node is already a column scanner. A cluster is a set of shards (each often a replica pair) plus the Distributed table engine that knows how to insert to a shard and how to run a `SELECT` as a DAG of remote reads. The coordinator parses SQL, rewrites it, ships subqueries, and merges. This is why `GROUP BY` at planetary scale works, and why a JOIN of two huge tables without a plan can concentrate a petabyte on one node and die.

## Sharding key vs random

Inserts into a Distributed table can be random (load spread, painful for local JOINs) or by a sharding key (users from the same id land together). Analytics that always filter by tenant want tenant-aligned shards. Analytics that scan everything want even bytes. You cannot have both perfectly. Replicas inside a shard give HA and extra read capacity; they are not extra shards.

`internal_replication` and who you insert to (local table vs Distributed) are how you avoid duplicate rows. Double-insert to both replicas yourself and you will count twice after a merge of mistakes.

## Query stages and the memory cliff

ClickHouse may push aggregation to shards (each shard aggregates locally) then merge. That is the good path. `GLOBAL JOIN` and some IN subqueries pull a set to every node — fine for a small dimension table, lethal for a fact table. The coordinator can also become the bottleneck if every shard sends a huge unsorted stream.

Settings (`max_memory_usage`, `max_bytes_before_external_group_by`) are not optional at cluster scale. Default unlimited is a cluster-killer. Circuit breakers belong in a proxy if many users share the cluster.

## Failure modes of distributed SQL

The concrete failure is a node that is slow (disk, compaction), so the whole query waits on the tail, and the user retries, doubling load. Mid-size steal: hedged requests where appropriate, isolate bad replicas, and hedge less on mutations.

Operational gotcha: schema drift — a column added on 5 of 6 shards. Queries fail weirdly. Manage DDL with `ON CLUSTER` and check. Another is using Distributed for tiny lookups in a hot API. You will pay coordinator latency forever; use a local table or a KV. ZooKeeper/Keeper is in the replica path; if it is sick, replication lags and Distributed reads may hit stale replicas depending on settings. `load_balancing` and `max_replica_delay` exist. Network: a cross-AZ cluster with a verbose query will cost more in egress than in EC2. Place shards with data locality in mind. Steal the scatter-gather mental model: always ask what is shipped where. Explain a query on the cluster, not only on localhost. If you need consistent exactly-once ingest, the Distributed async insert path plus Keeper is a design review, not a default. Test a kill of one shard mid-query. The error should be loud. Silent partial results are worse than a failure. Prefer `insert_distributed_sync` when a pipeline cannot tolerate "queued on the Distributed table and gone." Async inserts look fast until a node dies holding the queue. Document which tables are sync and which are best-effort, the same way you would document a message bus ack mode.

## What you can borrow

- Pick a sharding key for the JOINs you need, or accept random shards and no local joins.
- Push aggregation to shards; never GLOBAL JOIN two fact tables.
- Cap memory per query at the gateway; one coordinator OOM is a full outage.
- Keep schemas in lockstep with `ON CLUSTER` and replica delay limits.
