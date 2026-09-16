---
title: "CRDTs: Conflict-Free Types When You Cannot Afford a Single Primary"
slug: "crdts-conflict-free-replicated-data-types"
description: "State-based versus operation-based CRDTs, the data types that actually ship (counters, maps, text), and when last-write-wins is honest enough."
publishedAt: "2026-09-04"
updatedAt: "2026-09-16"
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

## A worked counter versus a stock reservation

Two warehouses increment a G-Counter for “widgets seen.” Merge is sum of per-replica slots. That number is “how many we have counted,” not “how many we may sell.” Selling the last widget needs a reservation: a primary, a compare-and-swap, or a consensus group. If you put stock on a PN-Counter, two partitions can both decrement to zero and you oversell. The CRDT did its job — it converged to −2 or to a pair of vectors that sum wrong for the business.

Shopping carts as OR-Sets are the happier case: add item with a unique tag, remove remembers the tag, merge unions survivors. Two devices adding the same SKU twice may be two lines or one, depending on whether identity is SKU or tag. Product, not lattice theory, decides that.

## Failure modes

**Tombstone growth.** Sequence CRDTs and OR-Sets remember removals. Without compaction or a garbage-collection epoch all replicas acknowledge, metadata becomes the document. Libraries expose compaction; rolling your own “just delete tombstones after 30 days” will resurrect deleted characters if a laptop replica was offline for 31.

**False “conflict-free.”** LWW registers converge by dropping a write. Maps of LWW registers still lose concurrent field updates if you LWW the whole map instead of per field. Name the grain of the register.

**Causal delivery skipped.** Operation-based CRDTs assume a reliable, often causal, broadcast. UDP gossip of ops without buffering is not a CmRDT; it is a lost increment.

**Mixing with last-writer SQL.** Dual-writing a CRDT replica and a Postgres row “for reporting” without a defined extract will show reporting lag as disagreement. Treat the CRDT as source and build snapshots, or the reverse — not both as truth.

## When not to use a CRDT

Bank ledgers, unique-email signup, “exactly-once” coupons. You want serializability or a carefully isolated reservation. Also skip CRDTs when concurrent writes are rare and a single-primary database with retries is cheaper to operate than compaction and replica identity.

## Operational gotchas

Every replica needs a stable ID for G-Counters and unique tags. Recycling a replica ID reuses a slot and corrupts sums. Persist replica IDs next to the data. Measure merge CPU and payload size in gossip; state-based maps of large documents need deltas (delta-CRDTs) or you will melt mobile radios.

## Review checklist

- Merge semantics written in product language (union / max / lost-update).
- Tombstone/compaction story for any set or sequence type.
- Replica IDs are durable and not reused.
- Inventory-like invariants have a non-CRDT reservation path.

## A worked failure mode

A collaborative editor uses a last-write-wins map for a bank-like balance because "CRDT" was on the slide. Two offline clients both apply -50; both win in different orders; money is created or destroyed depending on merge. Another team uses an OR-set for unique emails and cannot explain why a re-added email resurrected. The failure is picking a CRDT whose algebra does not match the business invariant. Counters, sets, and text have different laws. If you need a total order on money, you need a primary or a consensus log, not a casual merge.

## When this is the wrong tool

CRDTs are the wrong tool for unique constraints, double-entry bookkeeping, and any invariant that is not preserved by the merge function. They are overkill for a single-region CRUD app. Do not CRDT a document if you can lock a row. Use CRDTs when concurrent edits without a primary are a true requirement and you can prove the merge is the product behavior you want.
