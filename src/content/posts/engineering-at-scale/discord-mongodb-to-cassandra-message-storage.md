---
title: "Discord's First Big Migration: MongoDB to Cassandra for Messages"
slug: "discord-mongodb-to-cassandra-message-storage"
description: "Why Discord outgrew a single MongoDB replica set for message storage and moved to Cassandra years before its later ScyllaDB migration."
publishedAt: "2025-06-28"
updatedAt: "2026-09-16"
category: "Discord"
tags:
  - Engineering at Scale
  - Discord
  - Databases
  - Migrations
---

In Discord's earliest days, messages were stored in MongoDB, which made complete sense for a young product: MongoDB's document model was flexible and fast to build against, and a single replica set was easy to operate when message volume was modest. That equation flipped hard as Discord's usage grew. By a few hundred million stored messages, the single-replica-set model was straining, and by the time Discord was approaching a billion messages the writing was on the wall: continuing on MongoDB would have meant either a painful multi-shard MongoDB deployment or accepting the performance ceiling of the existing setup, neither of which fit where the product needed to go. Discord made the call to migrate message storage to Cassandra, years before the later, widely discussed migration off Cassandra to ScyllaDB that addressed a different set of problems at a later stage of scale.

## Why Cassandra fit the message workload

Discord's message data has a shape that maps unusually well onto Cassandra's data model: messages belong to channels, are almost always accessed by channel and time range (scrolling through a channel's recent history), and are overwhelmingly append-only, with edits and deletes being relatively rare compared to raw write volume. Cassandra's wide-column model let Discord key data by channel and cluster rows by message ID (itself roughly time-sortable, similar in spirit to Twitter's Snowflake scheme), so that "get the most recent messages in this channel" became an efficient range query against a single partition rather than a scatter-gather across shards.

Just as importantly, Cassandra offered linear horizontal scalability with no single leader node coordinating writes, unlike a MongoDB replica set where writes to a given shard fundamentally go through a primary. That matched what Discord actually needed: the ability to keep adding capacity by adding nodes as message volume grew, without hitting the ceiling of a single primary's write throughput.

```
channel_id (partition key) --> messages clustered by message_id (time-sortable)
```

## Migrating a live, growing dataset without downtime

Moving an actively growing, latency-sensitive dataset the size of Discord's message history from one database to a completely different data model is not a weekend project. The migration had to run both systems in parallel for a period, backfilling historical data into Cassandra while new messages continued flowing in, and cutting reads over carefully enough that a bug in the migration path wouldn't be user-visible as missing or duplicated messages in someone's channel history. Discord's engineers wrote about the migration candidly, including the operational lessons learned from running two large stateful systems side by side during the transition.

## Setting up the next decade of storage decisions

This MongoDB-to-Cassandra migration set the data model — partition by channel, cluster by time-sortable ID — that Discord's message storage kept even through the later migration off Cassandra itself, when operational pain from Cassandra's compaction behavior and tail latencies at much higher scale eventually pushed Discord toward ScyllaDB. The lesson of the earlier migration outlived the database it was originally built for: get the partitioning and access-pattern design right, and you can swap out the underlying storage engine later without redesigning how the application thinks about its own data.

## What broke when they scaled

A MongoDB replica-set primary is a write funnel. As Discord approached hundreds of millions, then a billion messages, that funnel — plus working set that no longer fit RAM — made "just add a secondary" useless. Sharded Mongo was a possible path; Discord's engineers chose Cassandra instead because the access pattern was already clear: almost all reads are "messages in this channel, recent first," and writes are appends. That maps to `channel_id` partitions and clustering by a time-sortable snowflake-like id. A document store that encouraged fetching rich objects was the wrong shape for an ever-growing log.

Migration mechanics: two systems, one growing firehose. Backfill must be idempotent; message ids must not collide; edits/deletes during the dual-write window must apply to both. A user scrolling history is an integration test you cannot fake. Discord's write-ups treat this as operational work measured in months, not a dump/restore.

The model outlived Cassandra. When GC and compaction later justified ScyllaDB, they did not go back to Mongo's document layout. Partitioning by channel remained the invariant. That is the scaling lesson: pick the key for the query you cannot make slow.

## A smaller-team version of the same idea

Store chat as an append-only log keyed by room, ordered by id. Postgres with `(channel_id, message_id)` and a hot recent index will take you far. Move to a wide-column store when a single primary cannot absorb writes or when history no longer fits a comfortable working set. Do not shard prematurely. When you migrate, dual-write new messages first, backfill old, then compare reads on a shadow path.

## What you can borrow

- Match your data model to your dominant access pattern early — Discord's channel-partitioned, time-clustered design paid off across more than one storage engine because it reflected how the data was actually queried, not just how it was written.
- A single-primary replica set has a real write-throughput ceiling; if your growth trajectory will exceed it, plan the migration before you're forced into it under pressure.
- Running old and new storage systems in parallel during a migration, with careful backfill and cutover, beats a risky big-bang switch for data users depend on being complete and correct.
- Good data-model decisions can outlive the specific database engine they were designed for — invest in getting the model right independent of which product you're running it on today.
