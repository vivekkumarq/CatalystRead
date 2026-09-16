---
title: "Five Consistency Levels, One Global Database: Cosmos DB's Tunable Tradeoff"
slug: "microsoft-cosmos-db-tunable-consistency"
description: "How Azure Cosmos DB made consistency a per-request choice instead of a cluster-wide religion, and what that means for globally distributed apps."
publishedAt: "2026-09-20"
updatedAt: "2026-09-20"
category: "Microsoft"
tags:
  - Engineering at Scale
  - Microsoft
  - Databases
  - Distributed Systems
sources:
  - title: "Consistency, Availability, and Convergence"
    author: "Mahajan, Alvisi, and Dahlin"
    publisher: "University of Texas at Austin technical report"
    url: "https://www.cs.utexas.edu/~lorenzo/papers/cac-tr11.pdf"
  - title: "Azure Cosmos DB consistency levels"
    publisher: "Microsoft Learn"
    url: "https://learn.microsoft.com/en-us/azure/cosmos-db/consistency-levels"
  - title: "Schema-Agnostic Indexing with Azure DocumentDB"
    author: "Shukla et al."
    publisher: "VLDB 2015"
    url: "https://www.vldb.org/pvldb/vol8/p1668-shukla.pdf"
---

Most globally distributed databases pick a point on the CAP map and live with it. You get a strongly consistent cluster that pays in latency whenever a write has to wait on distant replicas, or you get an eventually consistent store that is fast until a user refreshes and sees last week. Azure Cosmos DB, the successor to DocumentDB, treated that binary as a product failure. The service offers five well-defined consistency models and lets an application choose a default for an account and then override it per request. The engineering claim is not that consistency is free. It is that the same replication pipeline can serve different correctness needs without spinning up a second database.

## Why a single global default is the wrong product

A mobile session that writes a user's own profile and immediately reads it back needs a strong guarantee in that user's region. A product catalog that is updated hourly and read worldwide does not. Teams that only have eventual consistency paper over the first case with caches, version fields, and "please wait two seconds" UI. Teams that only have linearizability pay transcontinental round trips for the second case. Cosmos DB's five levels — strong, bounded staleness, session, consistent prefix, and eventual — sit between those extremes with documented latency and availability properties rather than folklore.

Session consistency is the workhorse for interactive apps: a client that wrote a document will see its own writes, even if other clients still lag. Bounded staleness puts a numeric cap on how far replicas may drift in time or versions. Consistent prefix promises that readers never see out-of-order writes. Strong consistency coordinates across regions; eventual consistency does not. Publishing those contracts in the service description, instead of burying them in a paper, is what made the knob usable by application teams rather than only by storage engineers.

## How the replica pipeline actually serves five answers

Under the hood Cosmos DB keeps a partitioned, multi-master (or single-write-region) log of operations and replicates it. Consistency is implemented by how much of that log a read is allowed to observe and how many replicas must acknowledge a write. A strong read waits until a quorum that can prove no newer committed write exists in the configured replica set. An eventual read may return any prefix. Session tokens travel with the client so a follow-up read can wait until the replica has applied at least that token. Bounded staleness tracks lag against a configured window and stalls or redirects when the window would be violated.

That design only works if the system can measure lag and if clients can carry session state. Lose the session token — a new browser tab, a load balancer that hashes poorly, a retry that forgot headers — and "session consistency" silently degrades to something closer to prefix or eventual. Operators who treat the five names as marketing copy and never test failover will discover this during a region outage, when write regions move and tokens issued against the old primary are no longer meaningful in the way the app assumed.

The VLDB work on schema-agnostic indexing sits beside this story: automatic indexing of JSON documents is useful only if the query engine reads a replica that is consistent enough for the query's meaning. A unique-constraint check against an eventual replica is a race with a name. Cosmos DB therefore ties indexing, conflict resolution (last-writer-wins or stored procedures), and consistency into one product surface instead of leaving each as an independent experiment.

## What you can borrow

- Publish a small, named menu of consistency options with latency and failure semantics, then default the common path (often session) rather than making every caller invent a protocol.
- Carry a session or fencing token on the client for "read your writes"; treat missing tokens as a first-class bug, not an edge case.
- Bound staleness with numbers (time or versions) that alerting can watch; unbounded "eventual" is not a SLO.
- Do not run uniqueness, inventory decrements, or payment captures against a replica that is allowed to lag. Pick strong or a single-region write for those keys.
- Test region failover with the same client code that production uses, including header propagation, or the consistency you bought will not be the consistency you get.
