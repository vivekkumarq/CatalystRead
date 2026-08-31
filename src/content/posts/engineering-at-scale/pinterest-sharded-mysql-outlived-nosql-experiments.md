---
title: "Why Pinterest Bet on Sharded MySQL Over NoSQL"
slug: "pinterest-sharded-mysql-outlived-nosql-experiments"
description: "Pinterest hit early scaling walls, tried NoSQL alternatives, then built ID-encoded sharded MySQL instead — and it outlasted the exotic options."
publishedAt: "2026-04-23"
category: "Pinterest"
tags:
  - Engineering at Scale
  - Pinterest
  - MySQL
  - Databases
---

Pinterest's hypergrowth years, roughly 2011 and 2012, pushed the company against a wall familiar to many fast-scaling startups: a single primary MySQL database paired with Memcached and Redis for caching, which had been entirely sufficient early on, started buckling under user growth that outpaced what a handful of database servers could serve. Pinterest's engineers have written candidly about hitting this ceiling and having to decide, quickly, what to build next.

## The NoSQL detour

Like much of the industry at the time, Pinterest evaluated NoSQL options that were gaining popularity for exactly this kind of scaling problem, including experimenting with systems like Cassandra and HBase for parts of their workload. What they found, in their own retrospectives, was real friction on both fronts: the operational tooling around some of these systems was still immature at the time, and the eventual-consistency and data-model tradeoffs those systems made didn't line up well with how Pinterest's core data actually needed to behave. Pins, boards, and the follow graph benefited from relational structure, straightforward query patterns, and strongly consistent primary storage — properties that are easy to take for granted until you give them up.

## Sharding plain MySQL instead

Rather than fully committing to a NoSQL system, Pinterest built a sharding scheme on top of ordinary MySQL. Object IDs were designed to embed shard information directly in their encoding, so a given ID alone was enough to route a query to the correct shard without a separate, potentially bottlenecked lookup service. They built accompanying data-access-layer tooling to handle routing and manage resharding as the platform grew, letting them scale horizontally while keeping the operational maturity of a technology their team already understood deeply — well-worn tooling for replication, backups, and failure recovery, rather than learning a newer system's failure modes for the first time under production load.

## Polyglot, but pragmatic

Pinterest paired sharded MySQL with an aggressive caching layer in front of it and continued to use systems like HBase for specific analytical and derived-data workloads where its model was actually the better fit, rather than trying to force one storage technology to serve every use case across the company. That's a meaningfully different philosophy from either "NoSQL for everything" or "one database for everything" — pick the right tool per workload, but don't switch your primary, relationally-shaped data off a technology that's working just because something newer is fashionable.

| Factor | Sharded MySQL | NoSQL alternatives (at the time) |
|---|---|---|
| Team familiarity | High — years of operational experience | Low — new failure modes to learn |
| Data model fit | Strong for relational Pins/boards/graph | Mismatched for some core access patterns |
| Operational tooling maturity | Mature | Still developing |

## What you can borrow

- Don't discount operational maturity and your team's existing familiarity with a technology when evaluating scaling options — it's a real factor, not a excuse to avoid learning something new.
- ID-encoding schemes that embed shard or location information directly are a simple, durable sharding technique that avoids a separate routing lookup on every query.
- It's fine, and often better, to use different storage systems for different sub-workloads rather than forcing one technology to serve every access pattern in your company.
- A technology that looks less impressive on paper but that your team can operate confidently under pressure often beats a theoretically more scalable option you're still learning.
