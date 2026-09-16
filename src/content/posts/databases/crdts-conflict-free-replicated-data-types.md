---
title: "CRDTs: Conflict-Free Types When You Cannot Afford a Single Primary"
slug: "crdts-conflict-free-replicated-data-types"
description: "State-based versus operation-based CRDTs, the data types that actually ship (counters, maps, text), and when last-write-wins is honest enough."
publishedAt: "2026-09-04"
category: "Databases"
tags:
  - Databases
  - Distributed Systems
  - CRDT
  - Collaboration
sources:
  - title: "A comprehensive study of Convergent and Commutative Replicated Data Types"
    author: "Marc Shapiro, Nuno Preguiça, Carlos Baquero, Marek Zawirski"
    publisher: "INRIA Research Report, 2011"
    url: "https://hal.inria.fr/inria-00555588"
---

If two replicas accept writes while partitioned, a single-primary database has to pick a winner or block. CRDTs (Shapiro et al.) are data types whose merge is **associative, commutative, and idempotent** (for state-based / CvRDTs), so any order of gossip still converges. That is how collaborative editors, shopping carts, and some multi-region caches avoid a coordinator on every keystroke.

## Two families

**State-based (CvRDT):** replicas periodically send their full state (or a compact summary). Merge is a `join` on a join-semilattice — think `max` of two counters' component vectors. Easy to reason about; watch bandwidth.

**Operation-based (CmRDT):** replicas broadcast operations that must be delivered reliably, often in causal order. Smaller messages; you just bought a broadcast protocol.

```text
G-Counter: each replica increments only its slot; value = sum(slots)
OR-Set:    add unique tags; remove remembers tags; merge unions surviving elements
```

A G-Counter cannot decrement. PN-Counters add a second vector for decrements. If your product needs "exactly 3 items in stock worldwide," a CRDT counter is the wrong primitive — you wanted reservations and a primary, or a consensus group.

## Text is the famous hard case

Sequence CRDTs (RGA, WOOT, later Yjs / Automerge internals) attach unique IDs to characters so concurrent inserts commute. Tombstones and metadata grow; compaction is a product feature. If you are implementing Google Docs from a blog post, you will ship a tombstone leak. Use a library, then learn the paper to debug it.

## LWW is a CRDT, barely

Last-write-wins registers are a lattice (`max` of timestamp, then value). They converge. They also drop the other write. That is fine for "user's theme color" and unacceptable for "both edits to a legal clause." Calling LWW a CRDT in a design review is accurate and incomplete — name the lost update.

Use CRDTs when concurrent writes are the common case and the merge semantics match the domain (union of tags, max of last-seen, collaborative text). Use a leader when the domain's merge is "call a lawyer." The INRIA report is still the map of which type you are actually proposing.
