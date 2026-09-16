---
title: "Outgrowing the Workspace: Slack's Move to Fine-Grained Sharding"
slug: "slack-workspace-sharding-to-fine-grained-sharding"
description: "How Slack's original one-workspace-per-shard data model buckled under Enterprise Grid and giant workspaces, and why finer-grained sharding replaced it."
publishedAt: "2025-07-22"
updatedAt: "2026-09-16"
category: "Slack"
tags:
  - Engineering at Scale
  - Slack
  - Sharding
  - Databases
---

Slack's original data architecture made a natural early assumption: a workspace was the right unit of sharding. All the data for a given workspace — channels, messages, users, integrations — lived together, colocated to make the vast majority of queries (which are naturally scoped to a single workspace) fast and simple, without needing to fan a query out across shards. For a product built around independent teams each running their own workspace, this was a genuinely sensible starting point, and it worked well for a long time.

## When "one workspace, one shard" stops being true

The assumption broke down from two directions at once. First, some individual workspaces grew enormous — large companies with tens of thousands of employees active in a single workspace generated data volume and query load that a single shard, however well provisioned, couldn't comfortably absorb, creating hot shards that dwarfed the typical workspace's footprint. Second, and in the opposite direction, Slack's introduction of Enterprise Grid let large organizations run many connected workspaces as one coordinated entity, with shared channels and cross-workspace search and features — which meant "workspace" stopped being a clean, self-contained sharding boundary at all, since a single logical organization's data might legitimately need to span many workspaces with relationships between them.

Together, these two pressures meant the original model was wrong in both directions simultaneously: too coarse for giant single workspaces, and not the right boundary at all for organizations spanning many connected workspaces.

```
old model:  1 workspace  <-->  1 shard          (breaks: huge workspaces overload one shard)
new model:  workspace data split across finer-grained shard keys, sized to actual load/entity
```

## Moving to a finer-grained sharding key

Slack's response was to move toward finer-grained sharding, splitting data within a workspace along boundaries like channels rather than treating the whole workspace as an atomic unit that had to live on one shard. This let Slack size shards according to actual data volume and load rather than according to organizational boundaries that had nothing to do with technical scaling needs — a busy channel with enormous message volume inside an otherwise modest workspace no longer had to share a shard's capacity with everything else in that workspace, and a giant workspace's load could be spread across many shards instead of concentrated on one.

This is a genuinely hard migration to execute, precisely because the old sharding key was baked into a huge amount of application code, query patterns, and operational tooling built up over years — unwinding "workspace equals shard" required carefully identifying every place that assumption was implicit rather than explicit, then migrating live production data to the new scheme without breaking the guarantees users depended on, like message ordering within a channel.

## Aligning shard boundaries with actual growth, not org charts

The deeper lesson embedded in this migration is that a sharding key chosen because it maps cleanly onto a product concept (a workspace, an account, a tenant) is not automatically the right key for scaling, and the two can diverge substantially as usage patterns evolve in ways the original design didn't anticipate. Product concepts like "workspace" are stable and meaningful to users, but the load characteristics behind them are not — some workspaces are enormous, some are tiny, and their growth trajectories vary wildly, none of which the original sharding boundary had any way to account for.

## A concrete failure mode when changing shard keys

Slack's move from workspace-shaped shards toward finer grains is a response to mega-workspaces: one customer becomes the shard. Mid-size teams hit this as "our biggest tenant is 40% of CPU." The failure mode of a re-shard is a dual-read bug: some channels moved, some rows did not, and search or unread is split. Steal an explicit migration state per entity, with a token that forces reads to the new home after cutover.

Operational gotcha: jobs and websockets that still target the old shard by workspace id in a cache. You will debug ghosts. Another is transactions that used to be local to a workspace shard and are now cross-shard for a thread and its files. Redesign those flows before the move. Fine-grained sharding also explodes connection counts to MySQL or Vitess; pools need redesign. Hot channels still exist inside a workspace — a company-wide #general — so channel id as key can still hotspot. You may need a further split. Do this only with a tenant that is actually burning you; premature fine-grained sharding is distributed complexity without the pain that pays for it. Measure per-tenant and per-channel QPS first. The steal is the willingness to change the shard key when the product's gravity well moves, plus the dull tooling to move rows without a weekend of read-only Slack.

## What you can borrow

- A sharding key that maps naturally onto a product concept isn't automatically the right key for balancing load — validate that assumption against actual, current usage distribution, not just conceptual tidiness.
- Watch for new product features (like a way to link multiple tenants together) that can quietly invalidate a sharding boundary that was previously a clean fit.
- Hot-shard problems from outlier-sized entities (one giant customer, one giant workspace) are worth designing for before they happen — they rarely announce themselves gradually.
- Migrating a deeply baked-in sharding assumption is a major project; budget for finding every implicit dependency on the old key, not just the obvious explicit ones.
