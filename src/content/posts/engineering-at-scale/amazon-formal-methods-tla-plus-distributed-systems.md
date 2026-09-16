---
title: "Why Amazon Turned to TLA+ to Find Bugs Before They Shipped"
slug: "amazon-formal-methods-tla-plus-distributed-systems"
description: "How AWS engineering teams adopted Leslie Lamport's TLA+ specification language to catch distributed-systems bugs that testing alone couldn't find."
publishedAt: "2026-02-09"
updatedAt: "2026-09-16"
category: "Amazon"
tags:
  - Engineering at Scale
  - Amazon
  - Distributed Systems
  - Formal Methods
sources:
  - title: "How Amazon Web Services Uses Formal Methods"
    author: "Chris Newcombe et al."
    publisher: "Communications of the ACM, 2015"
---

Distributed systems bugs have an irritating property: the ones that actually hurt you are rarely in the code paths anyone thought to test. They live in the interleavings — a node failing at exactly the wrong moment during a leader election, a message arriving out of order during a rare retry path, two supposedly independent failures overlapping in a way nobody's design review considered. Testing and code review, no matter how disciplined, sample from the space of possible executions; they don't exhaustively cover it, and for a sufficiently subtle concurrency bug, the specific interleaving that triggers it might never come up in testing at all, only to appear once in production at a scale and frequency that makes it expensive.

## A specification language, not a programming language

AWS engineering teams, starting with groups working on systems like DynamoDB, S3, and EBS's underlying protocols, began adopting TLA+, a formal specification language created by Leslie Lamport, to address exactly this gap. TLA+ isn't a programming language — you don't run a TLA+ specification the way you'd run code. It's a language for precisely describing what a system's states and allowed transitions are, abstracted well above implementation detail, so that a design's actual logical behavior can be checked mechanically rather than only reasoned about informally in a design document or a whiteboard discussion.

The mechanical check comes from the TLC model checker, which explores the reachable state space of a TLA+ specification and can exhaustively verify — for a bounded configuration, such as a small number of nodes — whether an invariant the designer expects to always hold actually holds in every reachable state, or whether there's some sequence of events that violates it. When TLC finds a violation, it produces a concrete counterexample trace: the exact sequence of steps that breaks the invariant, which is enormously more actionable than "we suspect there might be a race condition somewhere in here."

## Bugs found before a line of implementation code existed

The value AWS engineers reported, as described in a 2015 Communications of the ACM article by engineers including Chris Newcombe, was catching serious design-level bugs during the specification phase — before implementation, and well before the bugs could have shown up in production as an outage. Several of these were the kind of subtle, rare-interleaving bugs distributed systems are notorious for: correct-looking under normal operation, and only wrong under a specific, hard-to-reproduce sequence of failures and concurrent operations, exactly the category testing tends to miss and code review tends to wave through because the logic looks reasonable locally.

## Reserved for the parts that actually need it

TLA+ at AWS was never applied to everything — writing a formal specification and checking it has real upfront cost, and most application code doesn't have the kind of subtle concurrent state-machine behavior that makes formal verification worth that cost. It gets reserved for the genuinely gnarly cases: core replication protocols, consensus algorithms, and other pieces of infrastructure where a subtle bug could mean silent data loss or a correctness violation across an entire fleet, and where the cost of that bug reaching production vastly outweighs the cost of specifying and checking the design carefully first.

## What formal verification changes about design review

The deeper shift formal methods brought wasn't just bug-finding, it was moving design review from "does this sound right to experienced engineers reading it" to "can we mechanically prove this invariant holds across every reachable state." Those are different bars, and for the class of systems where getting it wrong is catastrophic and expensive to fix after the fact, the second bar is worth the extra upfront investment.

## What broke when they scaled

Implementation tests explode combinatorially; so do TLA+ models if you leave in too much detail. AWS's 2015 CACM paper is explicit that the win is specifying *protocols* — replication, leases, failover — not modeling every Java class. Teams that tried to "verify the service" drowned in state space: TLC would not finish, so they either bounded the model into irrelevance or abandoned it. The scaling skill is abstraction: a few nodes, a few concurrent operations, invariants that actually matter (no split brain, no acknowledged write lost).

A second break is spec drift. A TLA+ document that is not updated when the protocol changes is a false comfort, same as an outdated runbook. Amazon's reported practice was to keep specs next to the design of the high-stakes core and to use counterexamples as regression tests for the design, not as a substitute for unit tests of code.

Organizationally, TLA+ expertise is scarce. If only one engineer can read the spec, the next protocol change ships without checking. The CACM authors argued for training more engineers in specification, not for a priesthood. That is the cultural scale problem: formal methods that cannot survive a transfer of ownership do not survive.

## A smaller-team version of the same idea

For any lock, lease, or "exactly one primary" protocol, write the states and messages in a page of prose, then in PlusCal or TLA+ if the interleavings scare you. Check two nodes and a crash. You can get a surprising fraction of the AWS benefit with a pencil-and-paper invariant ("a write is never visible until N replicas ack") and a brutal chaos test. Bring TLC when you have lost data or split-brained once — or when you are about to, and you know it.

## What you can borrow

- Reserve formal specification for your genuinely high-stakes, subtly concurrent components — not everything needs it, but some things benefit enormously from it.
- A model checker that produces a concrete counterexample trace is far more useful for debugging a design than an informal suspicion that "there might be a race here."
- Specify a system's intended behavior precisely before implementing it, when the cost of a subtle bug reaching production would be severe.
- Treat design review as an opportunity to check invariants mechanically wherever you can, not only to sanity-check the design by reading it.
