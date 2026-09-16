---
title: "Citus: Sharding Postgres Without Pretending It Is Still One Node"
slug: "citus-postgres-sharding-extension"
description: "Distributed tables, reference tables, and the query router: what Citus can push down, and which joins become network products."
publishedAt: "2026-08-07"
category: "Databases"
tags:
  - Databases
  - PostgreSQL
  - Citus
  - Sharding
sources:
  - title: "Citus: Distributed PostgreSQL as an Extension"
    publisher: "Citus Data / Microsoft"
    url: "https://docs.citusdata.com/en/stable/"
  - title: "Why Citus uses PostgreSQL as a building block"
    publisher: "Citus Data"
    url: "https://www.citusdata.com/blog/"
---

Citus is a Postgres extension that adds a **coordinator** and **workers**. You pick a distribution column, Citus hashes it, and each worker stores a subset of shards as ordinary Postgres tables. The pitch is real: keep SQL, keep indexes, keep `COPY`, scale out the data that grew past one primary. The lie to avoid is "it is still one Postgres." Cross-shard joins and transactions have rules.

## Table types are the design

**Distributed tables** are sharded on a key (`tenant_id` is the usual SaaS pattern). **Reference tables** are replicated to every worker so joins to small dimension data stay local. **Local tables** live only on the coordinator. If you distribute `orders` on `customer_id` and `order_items` on `order_id`, you have created a distributed join problem. If both use `customer_id`, colocated joins can run per worker.

```sql
SELECT create_distributed_table('orders', 'tenant_id');
SELECT create_reference_table('countries');
```

Queries that filter on the distribution column route to one worker. Queries that do not scatter-gather. Aggregates can push down partial aggregates. `ORDER BY` / `LIMIT` without a shard key still touch all shards. `EXPLAIN` on the coordinator is mandatory; an app that assumes coordinator CPU is free will discover the coordinator is a bottleneck.

## Transactions and foreign keys

Single-shard transactions (all rows the same tenant) behave like Postgres. Multi-shard writes use 2PC. Foreign keys from a distributed table to a reference table work; foreign keys across arbitrary distributed tables often do not, or only in colocated cases. Unique constraints must include the distribution column. That last sentence is how "email is globally unique" becomes a product argument, not a `UNIQUE(email)` you copy from the monolith schema.

`COPY` and autovacuum still exist per worker. You inherited N Postgres operational planes. Autovacuum settings, bloat, and `ANALYZE` are per shard table. A single huge tenant on one shard is not solved by Citus; it is a hotspot, same as any hash shard.

## When Citus is the right Postgres

Multi-tenant apps with a strict tenant key, real-time analytics where you can pre-aggregate per shard, and teams that already know Postgres. Wrong: a social graph with unpredictable joins, or a workload that needs SERIALIZABLE across all tenants every request.

Managed Hyperscale / Cosmos DB for PostgreSQL (the Azure Citus offering) and self-hosted Citus share the model. Design the distribution key as if you will never change it — resharding is a project. Start with tenant_id, reference-table the rest of the small stuff, and ban cross-tenant joins in the application.

Read the Citus SQL reference for what is supported, not a conference demo. Then take your top 20 queries and mark each as single-shard or scatter. If most are scatter, you bought a coordinator for a warehouse-shaped job; a columnar warehouse might be cheaper than sharded row Postgres.
