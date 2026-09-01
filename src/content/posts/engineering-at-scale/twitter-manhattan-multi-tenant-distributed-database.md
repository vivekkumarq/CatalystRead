---
title: "Manhattan: Twitter's Multi-Tenant Distributed Database"
slug: "twitter-manhattan-multi-tenant-distributed-database"
description: "How Twitter replaced a patchwork of Cassandra clusters with Manhattan, a purpose-built, multi-tenant distributed database with pluggable storage engines."
publishedAt: "2025-07-10"
category: "Twitter"
tags:
  - Engineering at Scale
  - Twitter
  - Databases
  - Distributed Systems
---

By the early 2010s, Twitter was running a large number of independent Cassandra clusters, one or a few per team, each hand-tuned and hand-operated by whichever team owned it. That model created real pain at scale: onboarding a new use case meant standing up and tuning a new cluster from scratch, operational knowledge didn't transfer cleanly between teams running "the same" database in slightly different configurations, and there was no consistent story for multi-datacenter replication or operational tooling across all of them. Twitter built Manhattan as a distributed database designed from the outset to be multi-tenant — one well-operated system that many teams could share safely — rather than a pattern of many independently operated single-tenant clusters.

## Pluggable storage engines for different workloads

Rather than betting on one storage engine for every access pattern, Manhattan was architected with a pluggable storage layer, letting different datasets use different engines underneath a common distributed database interface: a storage engine tuned for read-heavy workloads, another tuned for write-heavy or time-series-like workloads, and the flexibility to add more as new access patterns emerged. This meant Manhattan could serve very different Twitter use cases — user data lookups, timeline-adjacent metadata, feature stores — from one operational system, instead of forcing every workload through the compromises of a single one-size-fits-all engine, or fragmenting back into many bespoke clusters.

Consistency was tunable per request, similar in spirit to Cassandra's model: callers could choose stronger or weaker consistency depending on what a given read or write actually needed, trading off latency and availability against strict correctness on a per-operation basis rather than a fixed global choice.

## Multi-tenancy as an operational discipline

Making one database genuinely safe for many independent teams to share required real engineering investment beyond just the storage layer. Manhattan needed strong isolation so that one tenant's misbehaving traffic — a runaway query pattern, a sudden spike — couldn't degrade performance for every other tenant on the same cluster, along with per-tenant quotas, monitoring, and capacity planning built into the system rather than bolted on. This is the unglamorous but essential work that makes multi-tenancy actually deliver on its promise: without it, "shared infrastructure" just becomes "shared blast radius."

```
many teams --> Manhattan (shared cluster, per-tenant quotas & isolation)
                    |
          pluggable storage engines per dataset
```

## Consolidating operational expertise

The payoff of Manhattan's design was concentrating deep operational expertise in one place instead of spreading thin Cassandra knowledge across dozens of team-owned clusters. A dedicated team could specialize in operating Manhattan well — capacity planning, failure recovery, multi-datacenter replication, upgrade rollouts — and every team building a product feature on top of it inherited that operational maturity automatically, rather than needing its own database experts. Manhattan became one of the core storage systems underpinning Twitter's user-facing data over the following years, illustrating a broader pattern in the company's infrastructure evolution: moving from many bespoke, team-owned systems toward fewer, more general, centrally operated ones as the company's scale made the coordination cost of the fragmented approach unsustainable.

## What you can borrow

- Many independently operated instances of "the same" database usually cost more in aggregate operational effort than one well-built multi-tenant system, once you cross a certain number of teams.
- A pluggable storage engine layer lets you serve genuinely different access patterns from one system without forcing every workload through the same compromises.
- Multi-tenancy is not free — isolation, quotas, and per-tenant monitoring are the real engineering work, not an afterthought you add once tenants start complaining.
- Consolidating infrastructure lets operational expertise concentrate in a small team instead of being thinly and unevenly distributed across every team that touches storage.
