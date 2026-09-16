---
title: "The Dynamo Paper: How Amazon Learned to Love Eventual Consistency"
slug: "amazon-dynamo-eventual-consistency-and-the-shopping-cart"
description: "How Amazon's shopping cart problem led to the 2007 Dynamo paper and reshaped how the industry thinks about availability versus consistency."
publishedAt: "2025-07-24"
updatedAt: "2026-09-16"
category: "Amazon"
tags:
  - Engineering at Scale
  - Amazon
  - Distributed Systems
  - Databases
---

Amazon's retail business runs on a simple but unforgiving rule: adding an item to a shopping cart should always work. A shopper who clicks "add to cart" during a network blip or a server failure and gets an error is a lost sale, and possibly a lost customer. Traditional relational databases, built around strong consistency, don't make that guarantee for free — during a network partition or node failure, a strongly consistent system typically has to refuse some writes to avoid showing conflicting data, which is exactly the CAP theorem tradeoff Amazon didn't want to accept for this use case. That problem led directly to Dynamo.

## Always writable, by design

Described in Amazon's 2007 SOSP paper "Dynamo: Amazon's Highly Available Key-Value Store," Dynamo was built internally to back services like the shopping cart where availability mattered more than immediate, strict consistency. The core decision was to make the system "always writable": a write should succeed even if some replicas are unreachable, even if that means different replicas temporarily hold different versions of the same data.

## The mechanics

Dynamo combined several techniques that, together, became a template for a generation of NoSQL databases. Consistent hashing partitioned data across a ring of nodes in a way that let the cluster grow or shrink without reshuffling most of the data. Vector clocks tracked causality between different versions of the same object, so the system could tell whether one version genuinely superseded another or whether they were concurrent, conflicting writes that needed reconciliation. Sloppy quorums and hinted handoff let writes succeed and be later delivered to the "correct" replica even when that replica was temporarily unreachable, trading strict replica placement for availability. Anti-entropy, using Merkle trees, let replicas efficiently detect and repair divergence during background reconciliation, and a gossip protocol handled cluster membership without a central coordinator.

## Pushing conflict resolution up the stack

The most philosophically interesting decision in Dynamo was where to resolve conflicts. Rather than have the database silently pick a winner between two concurrent, conflicting writes, Dynamo could return both versions to the application and let it decide — which, for a shopping cart, meant merging item lists together (effectively a union) instead of arbitrarily discarding one customer's addition. That's a database explicitly declining to solve a problem it doesn't have enough business context to solve correctly, and handing it to the layer that does.

## Legacy

The Dynamo paper's ideas rippled through the industry directly: Cassandra, Riak, and Voldemort were all built on its core techniques. Amazon's own DynamoDB, launched in 2012 as a managed service, borrowed the name and philosophy but is a distinct system — it trades some of the original paper's ideas, like exposed vector clocks and full peer-to-peer gossip, for a simpler, more predictable managed operational model.

## What broke when they scaled

Eventual consistency is fine until someone pays with a cart that is missing an item on one replica and double-charged on another. Amazon's Dynamo paper (SOSP 2007) is honest that the application must merge. Shopping carts can union SKUs; account balances cannot. Teams that copied Dynamo's always-writable pattern onto ledgers learned that sibling versions without a merge that preserves money are data corruption. Vector clocks also grow: many concurrent writers produce clock cruft and "I cannot merge this" objects that operators must resolve by hand.

Membership and hinted handoff create operational load. A node that was down comes back with stale data; anti-entropy must catch up before you retire the hints. At cluster sizes of the mid-2000s retail fleet, gossip and ring membership were tractable. The paper's own authors later built DynamoDB with a different control plane because customers would not run that machinery.

Sloppy quorums mean a write may not land on the "preference list" nodes immediately. Reads with R+W > N still have windows. Anyone treating Dynamo as "CA under partition" misread CAP; it is AP with repair. The scale break is when repair cannot keep up with write rate or when a hot key's replicas are all sick together.

## A smaller-team version of the same idea

If the user-facing action must always succeed, write to a local log or queue and reconcile. If two writers can race, define the merge (union, LWW with a timestamp you trust, or "ask the user"). Do not expose vector clocks in a CRUD API. Use a managed store with conditional writes when wrong merges cost money. Save full Dynamo-style N/R/W tunables for when you operate the database yourself and have read the paper's failure modes.

## What you can borrow

- Decide explicitly, per use case, whether you need strong consistency or whether availability matters more — don't default to strong consistency just because it's the familiar option.
- Consider pushing conflict resolution to the application layer when the app has business context (like "cart items should merge") that a generic database can't infer.
- Consistent hashing is a solid default partitioning strategy if you expect a cluster to grow over time and want to avoid mass data movement on every resize.
- "Always writable" is a deliberate tradeoff, not a free win — know what staleness your users can tolerate before you build around it.
