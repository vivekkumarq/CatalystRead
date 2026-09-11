---
title: "Outgrowing a Single MySQL Cluster: GitHub's Move to Vitess"
slug: "github-scaling-mysql-vitess"
description: "Why GitHub adopted Vitess to shard MySQL horizontally instead of continuing to scale a single primary vertically."
publishedAt: "2025-07-14"
category: "GitHub"
tags:
  - Engineering at Scale
  - GitHub
  - MySQL
  - Vitess
  - Databases
sources:
  - title: "GitHub Engineering Blog"
    publisher: "GitHub"
    url: "https://github.blog/engineering"
  - title: "Vitess Documentation"
    publisher: "Vitess Project"
    url: "https://vitess.io"
---

GitHub's core metadata — repositories, issues, pull requests, users, permissions — has lived in MySQL since the beginning. For a long time, the standard scaling playbook worked fine: a beefier primary, a pile of read replicas, careful query tuning, and partitioning the schema across a handful of functionally separated clusters. But that playbook has a ceiling. A single MySQL primary can only take so many writes per second no matter how much hardware you throw at it, and GitHub's write volume — driven by an ever-growing base of repositories, actions runs, and API traffic — was heading toward that ceiling on some of its busiest tables.

The traditional next step, application-level sharding, means teaching every service how to route to the right shard, handling resharding by hand, and living with that complexity forever. GitHub instead adopted Vitess, the database clustering system originally built at YouTube to solve exactly this problem, and later donated to the Cloud Native Computing Foundation.

## What Vitess actually changes

Vitess sits between the application and a fleet of MySQL instances and presents them as if they were a single logical database, speaking the MySQL protocol so existing application code mostly keeps working unmodified. Underneath, it handles:

- **Sharding** — splitting a large table's rows across many smaller MySQL instances by a shard key, so no single primary has to absorb all the writes.
- **Connection pooling and query routing** — a proxy layer (`vtgate`) that routes each query to the correct shard or shards, and aggregates results when a query spans more than one.
- **Online, low-downtime resharding** — splitting or merging shards while the system stays live, which matters enormously for a company that cannot take a maintenance window against a globally used product.
- **Topology management** — a consistent view (`vttablet`, `vtctld`) of which MySQL instances are primaries, replicas, and their health, automating failover.

For GitHub, the appeal wasn't just capacity — it was that Vitess is deliberately designed to make resharding a routine, low-risk operation instead of a once-a-decade fire drill.

## Migrating without stopping the world

Moving a live, business-critical database under a system like Vitess is itself a scaling problem. GitHub's approach followed a pattern common to large MySQL-to-Vitess migrations industry-wide: stand up Vitess alongside the existing clusters, use its replication machinery to keep shards in sync with the legacy primary, cut read traffic over table by table or cluster by cluster, validate consistency, and only then cut over writes — all while keeping a fast rollback path available at every step. The incremental nature matters as much as the destination: at GitHub's scale, a database cutover with no rollback plan is not an acceptable risk, no matter how well-tested the new system is.

## Why not just shard by hand

Application-level sharding is tempting because it requires no new infrastructure — you just add a routing function in your data-access layer. But every team that owns a query now has to be shard-aware, resharding means rewriting that routing logic and doing a slow, risky data migration, and cross-shard joins or transactions become bespoke application code. Vitess pushes that complexity down into infrastructure that a dedicated database-infrastructure team can own and improve centrally, so product engineers keep writing what looks like ordinary SQL against what looks like an ordinary MySQL server.

## What you can borrow

- Treat "can a single primary handle peak write volume with headroom" as a metric you track proactively, not one you discover during an incident.
- Prefer infrastructure-level sharding (a proxy/routing layer) over application-level sharding if you expect to reshard more than once — the operational cost of resharding by hand compounds.
- When migrating a critical datastore, do it incrementally with a working rollback at every stage — cut over reads before writes, and validate consistency continuously rather than trusting a one-time check.
- Don't build what you can adopt: a mature open-source system built for the same problem (Vitess, in this case) can save years compared to a bespoke sharding layer.
- Centralize sharding logic in infrastructure your data team owns, rather than scattering shard-awareness across every service that touches the database.
