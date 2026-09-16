---
title: "Decouple First: The Snowflake Elastic Data Warehouse Paper"
slug: "snowflake-storage-compute-separation-paper"
description: "Dageville et al. at SIGMOD 2016 described a warehouse that stores data in object storage and spins independent virtual warehouses for compute."
publishedAt: "2026-10-10"
updatedAt: "2026-10-10"
category: "Snowflake"
tags:
  - Engineering at Scale
  - Snowflake
  - Data Warehouses
  - Cloud Architecture
sources:
  - title: "The Snowflake Elastic Data Warehouse"
    author: "Dageville et al."
    publisher: "SIGMOD 2016"
    url: "https://dl.acm.org/doi/10.1145/2882903.2903741"
  - title: "Snowflake documentation: key concepts"
    publisher: "Snowflake"
    url: "https://docs.snowflake.com/en/user-guide/intro-key-concepts"
---

Traditional warehouses tied storage and compute in a shared-nothing cluster: add disks by adding nodes, resize by overnight migration, and let a heavy ETL job fight a dashboard for the same CPU. Benoit Dageville, Thierry Cruanes, Marcin Zukowski, and colleagues designed Snowflake as a cloud-native system with three layers: cloud object storage for durable table data, a multi-tenant service layer for metadata and transactions, and *virtual warehouses* — independent clusters of compute that you can start, stop, and size without copying the data. SIGMOD 2016 is the paper that made that architecture the industry's default diagram.

## Why shared-nothing stopped fitting the cloud

In Teradata-style designs, each node owns a slice of data. Elasticity means reshuffling slices. Cloud object storage already provides durability, cheap capacity, and HTTP GET. Snowflake's bet was that the extra IO to pull columns from S3 (or equivalent) could be hidden with aggressive local caching on warehouse nodes, while the operational win — two teams running two warehouses on one copy of data — would dominate. Isolation is the product: a rogue query saturates a warehouse, not the company's only cluster.

The service layer holds the rest of what a database is: catalogs, transactions, encryption keys, and query optimization. That layer must be highly available and multi-tenant without leaking one customer's metadata to another. The paper discusses a Cloud Services tier that is scaled independently of both storage and customer warehouses. Failures of that tier are existential; failures of a warehouse are local.

## Caching, pruning, and the economics of GET requests

Pure "compute against S3" would be slow and expensive. Warehouse nodes cache file blocks on local SSD. Repeated queries over the same hot tables look like a classic warehouse. Cold queries pay object-store latency. Micro-partitions (Snowflake's immutable file chunks with rich min/max metadata) exist so the optimizer can skip most GETs. The SIGMOD system is therefore not "no local state"; it is "local state is a cache, not the system of record."

Billing follows the architecture. Storage is billed by the compressed byte-month. Compute is billed by warehouse-second. That alignment is why finance teams liked Snowflake and why engineers learned to suspend warehouses. The failure mode is a forgotten large warehouse running overnight, or a warehouse per developer that never auto-suspends. Another failure mode is treating the services layer as infinitely cheap: too many tiny queries still hammer metadata.

Competitors copied storage/compute separation because the paper was right about cloud economics. The remaining differentiation is concurrency, pruning, and how much of the services tier you can take down without an incident. Mid-size teams who run their own warehouses on object storage are implementing this paper whether they cite it or not.

Multi-tenancy in the services layer also means noisy metadata neighbors: a flood of `INFORMATION_SCHEMA` queries or a pathological `SHOW` loop can hurt planning for everyone even when warehouses are isolated. Snowflake-style systems therefore rate-limit control-plane APIs and cache table metadata aggressively. If you clone the architecture in-house, put SLOs on the catalog, not only on query seconds, or you will scale compute while the brain of the warehouse is down.

## What you can borrow

- Keep one durable copy of table files in object storage; attach independent compute pools per workload.
- Treat local disks as caches with explicit eviction, not as shards you must rebalance when you scale.
- Isolate noisy jobs on their own compute so dashboards do not share a queue with ETL.
- Align cost with warehouse-seconds and auto-suspend; separation without shutdown is a bigger cloud bill.
- Invest in metadata that can prune files before GET. Random object-store scans will not feel like a warehouse.
