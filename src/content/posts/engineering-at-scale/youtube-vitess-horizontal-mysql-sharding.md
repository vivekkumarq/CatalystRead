---
title: "Vitess at YouTube: Horizontal Sharding Without Leaving MySQL"
slug: "youtube-vitess-horizontal-mysql-sharding"
description: "YouTube built Vitess to shard MySQL with a proxy, a lock server, and resharding workflows so a massive video site could keep SQL instead of betting the company on a new store."
publishedAt: "2026-10-20"
updatedAt: "2026-10-20"
category: "YouTube"
tags:
  - Engineering at Scale
  - YouTube
  - Databases
  - Sharding
sources:
  - title: "Vitess: Scaling MySQL at YouTube"
    publisher: "Vitess / CNCF"
    url: "https://vitess.io/docs/overview/history/"
  - title: "YouTube scalability"
    publisher: "Google / USENIX talks"
    url: "https://www.usenix.org/conference/lisa13/technical-sessions/presentation/sugu"
---

YouTube's user and video metadata grew faster than a single MySQL primary could handle, while the organization already had MySQL operational muscle — backups, replication, on-call muscle memory. A greenfield NoSQL rewrite would have thrown that away. Vitess, created at YouTube and later open-sourced (now a CNCF project), sits in front of many MySQL instances: a VTGate proxy parses SQL, routes to the right shard (VTTablet + mysqld), and a topology service (originally ZooKeeper, later etcd) stores serving graphs. Resharding is a first-class workflow, not a wiki page of dump and restore. Sugu Sougoumarane's talks are the historical record; the software is what Slack, Square, and others later ran for the same reason YouTube did: SQL plus horizontal scale.

## Proxy, shards, and the query planner you actually get

Application code talks to VTGate as if it were one database. In reality a `user_id` keyspace is hashed or range-split across shards. Queries that include the sharding key route to one shard and stay fast. Queries that do not — scatter/gather across all shards — stay possible and become the load pattern that will melt you. Vitess therefore pushes teams to denormalize and to keep a vindex (the sharding key mapping) honest. Cross-shard transactions exist with caveats; they are not InnoDB on one box.

VTTablet supervises MySQL, health checks, and failover coordination so the cluster manager can promote replicas. YouTube-scale replication lag is a product issue (a comment you cannot see yet). Vitess's serving graph can send reads to replicas with a specified lag tolerance. That is the same consistency menu as other large MySQL estates, made mechanical.

## Resharding without a weekend outage

The reason Vitess is more than a proxy is *online resharding*: copy data to a new shard set, catch up via replication, then atomically switch serving in the topology. Applications keep connecting. Getting this wrong — missed rows, dual serving, wrong vindex — is data loss. The workflow is deliberately conservative and operator-driven. Teams that treat Vitess as "Kubernetes MySQL" without practicing resharding in staging discover the hard path in production when one shard's disk fills.

Connection pooling is the original YouTube pain Vitess still solves. Browsers and PHP-era apps opened too many MySQL connections; a proxy multiplexes. Modern gRPC frontends still benefit because mysqld connection setup is not free. Query rewriting (limits, reserved keywords, schema tracking) is how old SQL keeps working against a sharded world.

The steal is cultural as much as technical: if SQL is your interface and the pain is size, shard with a routing layer and a rehearsed split, rather than rewriting every query for a new database. If your access pattern is scatter-only, sharding will not save you.

Schema change on a sharded estate is a fleet operation: `ALTER` must roll through shards without mixing incompatible row formats, and VTGate's schema tracker has to see the new columns before the app deploys. Pair migrations with VSchema updates in the same change window. A column that exists on half the shards is a Heisenbug that only some users can reproduce.

## What you can borrow

- Require the sharding key on the hot path; treat scatter queries as incidents waiting for a dashboard.
- Put a pooling proxy in front of MySQL before you outrun `max_connections`.
- Practice online resharding in staging with row-count and checksum verification.
- Serve lag-tolerant reads from replicas; pin the primary for read-your-writes sessions.
- Keep transactions inside a shard unless you have a documented cross-shard protocol and tests.
