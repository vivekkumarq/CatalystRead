---
title: "Vitess VTGate: How Queries Find a Shard Without the App Becoming a Router"
slug: "vitess-vtgate-routing-model"
description: "VTGate, VSchema, and scatter vs targeted queries: the routing layer that made YouTube's MySQL split look like one database."
publishedAt: "2026-08-18"
category: "Databases"
tags:
  - Databases
  - Vitess
  - MySQL
  - Sharding
sources:
  - title: "VTGate"
    publisher: "Vitess documentation"
    url: "https://vitess.io/docs/reference/programs/vtgate/"
  - title: "VSchema"
    publisher: "Vitess documentation"
    url: "https://vitess.io/docs/reference/features/vschema/"
---

Vitess sits in front of many MySQL processes and presents a mostly-MySQL protocol. **VTGate** is the stateless proxy that parses SQL, consults **VSchema**, and sends work to **VTTablet** (one per MySQL). The application's superpower is not knowing which shard owns `user_id=42`. The operational reality is that VTGate can only hide sharding when the SQL is routable.

## VSchema is the contract

You declare keyspaces, sharded tables, and the **sharding key** columns. VTGate hashes or looks up that key from equality predicates (`WHERE tenant_id = ?`). If the predicate is missing, the query **scatters** to all shards (or is rejected, depending on settings). `SELECT * FROM users` on a sharded table is a fleet event. `SELECT * FROM users WHERE id = ?` with `id` as vindex is one shard.

```sql
-- targeted: vindex on customer_id
SELECT * FROM orders WHERE customer_id = 42;

-- scatter: no routing information
SELECT * FROM orders WHERE status = 'OPEN';
```

**Unique vindexes** give you global uniqueness (a lookup table or a predetermined hash). **Non-unique vindexes** map many rows to a shard. Cross-shard JOINs are limited; Vitess can do some scatter-merge, but the happy path is denormalization or joining only within a shard. OLTP that needs `JOIN orders JOIN inventory` without a shared key will push you toward a reference unsharded keyspace or a different model.

## Transactions and sessions

VTGate sessions pin you to shards involved in the transaction. A transaction that touches two shards becomes a **2PC** (when enabled) or is forbidden. Keep transactions single-shard. `LAST_INSERT_ID()`, connection state, and some MySQL session variables are emulated; ORM "smart" features that inspect `information_schema` per request will surprise you.

Resharding is a Vitess feature: split/merge shards while serving. It depends on VReplication. It does not depend on the app changing hash functions mid-flight — that is the point of the routing layer. You still plan reshard windows and watch lag.

## Failure modes

VTGate is in the data path: scale it horizontally, watch CPU on parse/plan, and cache plans. A wrong VSchema deploys as a wrong routing table. Scatter storms show up as all MySQLs spiking together. Pinning bugs show up as uneven shard CPU.

If you only have one primary MySQL, you do not need Vitess. If you are about to hash `user_id` in every service, VTGate is cheaper than N ad-hoc routers. PlanetScale's product is this architecture as a service; the routing model is still VSchema.

Read the VSchema reference until you can classify each of your top queries as targeted, scatter, or illegal. Then put CI on `vtexplain` for the query set. The proxy cannot invent a shard key you did not put in the WHERE clause.
