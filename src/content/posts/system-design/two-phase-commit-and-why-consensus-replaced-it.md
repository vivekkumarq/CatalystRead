---
title: "Two-Phase Commit, Blocking, and Why Consensus Took Over Coordination"
slug: "two-phase-commit-and-why-consensus-replaced-it"
description: "How 2PC actually runs, why a crashed coordinator freezes the world, and how Raft/Paxos-backed transaction coordinators changed the picture."
publishedAt: "2026-07-18"
category: "System Design"
tags:
  - System Design
  - Distributed Transactions
  - Databases
  - Reliability
sources:
  - title: "Notes on Distributed Databases"
    author: "Bruce G. Lindsay et al."
    publisher: "IBM Research, 1979 (2PC lineage)"
    url: "https://dominoweb.draco.res.ibm.com/reports/RJ2571.pdf"
  - title: "Consensus on Transaction Commit"
    author: "Jim Gray and Leslie Lamport"
    publisher: "ACM TODS, 2006"
    url: "https://www.microsoft.com/en-us/research/publication/consensus-on-transaction-commit/"
---

Two-phase commit is the algorithm every distributed-transactions slide starts with: a coordinator asks participants to prepare, then tells them to commit or abort. It is also the algorithm that taught a generation of on-call engineers what "blocked" looks like — a lock held on a row in New York because a process in London died after saying "prepared" and before hearing "commit."

Gray and Lamport later showed you can recast commit as a consensus problem. That is the intellectual bridge from classic 2PC to Spanner-style and Cockroach-style coordinators that do not freeze forever when one machine vanishes.

## The protocol in four messages, plus the trap

1. Coordinator sends `PREPARE` to all participants.
2. Each participant flushes enough state to recover (undo/redo), then votes `YES` or `NO`.
3. If every vote is `YES`, coordinator logs a commit decision and sends `COMMIT`. Otherwise it sends `ABORT`.
4. Participants ack. Coordinator forgets the transaction.

Between step 2 and step 3, a `YES` participant cannot unilaterally abort or commit. It has promised. If the coordinator disappears in that window, the participant is **blocked**: it must hold locks until a new coordinator reconstructs the decision from a surviving log, or a human unsticks it.

```text
Participant (prepared, locks held)
        |
        |  coordinator crash, no backup of the decision
        v
   blocked until timeout heuristics or operator intervention
```

Heuristic timeouts that abort after N seconds can split the outcome: one participant commits from a late message, another aborted locally. That is how you get atomicity bugs that look like "impossible" customer reports.

## Three-phase commit and why it did not save everyone

3PC adds an extra round so a participant can infer a decision from peers after a coordinator failure, under extra timing assumptions. Those assumptions fail on real networks (asynchronous delays look like crashes). Most production databases did not standardize on 3PC; they either avoided distributed commit, used compensating sagas, or put the decision in a replicated log.

## Consensus on the commit record

If the commit decision itself is stored in Raft or Paxos, any majority of coordinators can finish the protocol. Participants still prepare, but they are no longer waiting on a single process's disk. That is the idea in "Consensus on Transaction Commit": the hard part is agreeing on one bit (commit vs abort) durably, then informing everyone.

This is also why "just use a transaction across two microservices" is expensive. You are buying a consensus group, prepared locks, and a recovery story — or you are buying a saga and accepting that money-shaped operations need idempotency keys and explicit compensation. Both are valid. Pretending HTTP + 2PC without a replicated coordinator is neither.

When you design a checkout that touches payments and inventory, name which of those two worlds you are in before you draw the boxes.
