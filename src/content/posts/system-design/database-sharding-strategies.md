---
title: "Database Sharding Strategies That Survive Growth"
slug: "database-sharding-strategies"
description: "Hash-based, range-based, and directory-based shard keys compared, and why resharding is the expensive part nobody plans for early."
publishedAt: "2025-08-11"
updatedAt: "2026-09-16"
category: "System Design"
tags:
  - System Design
  - Databases
  - Scalability
  - Distributed Systems
---

Sharding splits one logical database across multiple physical instances because a single machine eventually runs out of disk, memory, or write throughput no amount of vertical scaling fixes. The mechanics are less important than the shard key — get that wrong and every other decision inherits the problem.

## Picking a Shard Key

The shard key determines which shard owns a row, and it has to satisfy two competing needs: even distribution across shards, and co-locating data that gets queried together.

- **Hash-based**: `shard = hash(user_id) % N`. Distributes evenly, but range queries ("all orders this week") now have to fan out to every shard, since sequential IDs land on effectively random shards.
- **Range-based**: shard by ranges of the key (users A-M on shard 1, N-Z on shard 2; or by date range). Range queries stay on one shard, but distribution can be wildly uneven — a viral signup spike or a skewed key distribution concentrates load on one shard.
- **Directory-based**: a lookup table maps key to shard explicitly. Most flexible — you can rebalance by moving individual entries — but the directory itself becomes a dependency every query pays for, and a scaling bottleneck if not cached aggressively.

## The Query That Breaks First

Sharding is invisible until a query needs data from more than one shard. Joins across shards don't exist at the database level — they have to be done in application code, fetching from each shard and merging, which is slower and loses the transactional guarantees a single-database join gets for free.

```python
# What used to be one SQL JOIN becomes application-level fan-out
def get_order_with_customer(order_id):
    order = shard_for(order_id).query("SELECT * FROM orders WHERE id = ?", order_id)
    customer = shard_for(order.customer_id).query(
        "SELECT * FROM customers WHERE id = ?", order.customer_id
    )
    return merge(order, customer)
```

This is why shard key selection is really a question about your access patterns, not your data model: pick a key that keeps the queries you run *often* on one shard, and accept that the queries you run *rarely* pay the fan-out cost.

## Resharding Is the Expensive Part

Choosing wrong doesn't fail immediately — it fails at the next capacity wall, when you need to go from N shards to N+M and redistribute data live, without downtime, while writes keep landing. Two approaches:

1. **Pre-split more shards than you need on day one** (e.g., 4096 logical shards mapped many-to-one onto a handful of physical databases), so growth means moving logical shards between physical hosts — no key remapping, just relocation.
2. **Dual-write during migration**: write to old and new shard layouts simultaneously, backfill history, verify parity, then cut reads over — operationally heavier but works when pre-splitting wasn't planned for.

## A Rule of Thumb

Don't shard until a single primary genuinely can't keep up — read replicas, better indexing, and caching solve most scaling problems more cheaply than a sharded topology, which trades every cross-shard operation's simplicity for horizontal headroom. When you do shard, spend more design time on the key than on the mechanism; the mechanism is a solved problem, the key is specific to your queries.

## A worked example

Hash-shard users by `user_id` into 16 logical shards mapped to 4 physical DBs. Directory table (or consistent hash) maps id → shard. A request never joins across shards; a "user's orders" query is on the user's shard. Reshard: split logical shards by moving a subset with dual-write then cutover.

Hot key: a celebrity user_id — you add a special shard or cache.

## Failure modes

Sharding on a low-cardinality column. Cross-shard transactions as if they were local. Auto-increment IDs without a generator. Changing the hash function without a migration. Secondary indexes that need scatter-gather on every search. Global uniqueness without a coordinator.

ORMs that hide N-shard round trips.

## When this is the wrong tool

Vertical scaling and partitioning inside one instance come first. Read replicas may fix read load without sharding. Sharding is the wrong tool for a 50 GB database. If the access pattern is "scan everything," a warehouse or search index is better. Multi-tenant DBs with one tenant per shard only if tenants are large; tiny tenants should share. Do not shard to look like a FAANG interview.
