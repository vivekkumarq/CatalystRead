---
title: "How Slack Used Vitess to Scale MySQL Without Leaving SQL"
slug: "slack-vitess-scaling-mysql-horizontally"
description: "Why Slack adopted Vitess to shard MySQL horizontally at the connection-pooling and proxy layer instead of migrating off relational storage entirely."
publishedAt: "2025-07-05"
updatedAt: "2026-09-16"
category: "Slack"
tags:
  - Engineering at Scale
  - Slack
  - MySQL
  - Databases
---

Slack's core data — channels, messages, users, workspaces — lived in MySQL from early on, and MySQL's relational model, transactional guarantees, and mature tooling served the product well through years of growth. But a single MySQL instance, or even a modestly sharded set of instances managed by application-level sharding logic, eventually runs into the same wall every fast-growing company hits: write throughput and storage capacity outgrow what a small number of large instances can handle, and hand-rolled application-level sharding becomes an increasingly fragile, hard-to-evolve piece of infrastructure that every engineer touching the data layer needs to understand. Slack's answer was to adopt Vitess, a database clustering system originally built at YouTube, that lets you shard MySQL horizontally while keeping the SQL interface applications already depend on.

## Sharding without rewriting every query

Vitess works by sitting between applications and a fleet of MySQL instances, presenting what looks like a single logical database while actually routing queries to the correct physical shard behind the scenes. Applications continue speaking standard SQL through what looks like a normal MySQL connection, while Vitess's proxy layer (VTGate) handles the work of determining which shard (or shards) a given query needs to touch based on the sharding key, and VTTablet processes manage the actual MySQL instances underneath, handling connection pooling, query rewriting, and health checking per shard.

```
application --SQL--> VTGate (routing) --> VTTablet --> MySQL shard 1
                                       \-> VTTablet --> MySQL shard 2
                                       \-> VTTablet --> MySQL shard N
```

This meant Slack's application code largely didn't need to be rewritten to be sharding-aware — the complexity of "which shard does this row live on" moved out of application code and into Vitess's routing layer, which could evolve its sharding scheme independently of any single application team's release cycle.

## Resharding without downtime

One of Vitess's most valuable capabilities for a company like Slack, where workloads and data distribution keep shifting as the product and customer base grow, is live resharding: splitting or merging shards while the database continues serving production traffic, rather than requiring a maintenance window and a painful manual data-migration process. Vitess handles copying data to new shard topology, keeping it in sync with ongoing writes during the transition, and cutting traffic over incrementally — a capability that turned resharding from a rare, high-risk, all-hands event into a routine operational tool Slack could reach for as data distribution needs changed.

## Keeping the relational model where it earned its keep

Adopting Vitess reflected a deliberate choice to stay on a relational model rather than migrating this class of data to a NoSQL store, because Slack's workspace and channel data genuinely benefited from relational guarantees — transactions, joins, and a mature query language that a large number of engineers already knew well. Rather than trading those properties away to solve a scaling problem, Vitess let Slack keep them while solving the scaling problem at the infrastructure layer instead, which meant application teams didn't need to relearn a new data access paradigm just because the underlying storage now spanned many physical shards.

## Operational gotchas of Vitess in production

Vitess lets you keep MySQL semantics while sharding. It does not let you keep every JOIN and every cross-shard transaction you accidentally wrote. The failure mode is lifting a Slack-like monolith onto Vitess without a query inventory, then watching scatter queries fan out to every shard on a search-ish endpoint. Mid-size steal: explain the top 50 queries, add shard-key predicates, and ban unconstrained scatter in CI if you can parse SQL.

Operational gotcha: vtgate plans that change after a version upgrade. A query that was targeted becomes scatter and the primary CPUs melt. Pin and test. Another is sequences and unique keys that were global and are now per-shard; uniqueness of channel names or emails needs a lookup shard. Slack-scale also means online resharding: you must dual-write or copy with VReplication and switch traffic without dropping websocket-related rows. Rehearse on a shadow cluster. Connection pooling through vtgate is a new bottleneck that looks like MySQL is "fine." Watch vtgate CPU. If you have one primary and it is not dying, you do not need Vitess yet; you need indexes and replicas. Steal the operational model — a proxy that enforces sharding — when the alternative is manual application sharding you will get wrong. Vitess is a product you run, not a flag on RDS.

## What you can borrow

- Before concluding you need to abandon SQL for a scaling problem, check whether a horizontal-sharding layer (Vitess and similar systems) can get you the scale without giving up the relational model you actually rely on.
- Pushing sharding logic into an infrastructure layer rather than application code means your sharding scheme can evolve independently of every team's release cycle.
- Live resharding capability turns a rare, terrifying, high-risk event into a routine operational tool — worth the upfront investment if you expect your data distribution to keep shifting.
- Don't trade away properties (transactions, joins, query language maturity) you're actually using just to solve a scale problem that has other solutions.
