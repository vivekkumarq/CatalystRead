---
title: "The CAP Theorem: What It Actually Says, and What Teams Pretend It Says"
slug: "cap-theorem-what-it-actually-says"
description: "Brewer's conjecture, Gilbert and Lynch's proof, and why 'we picked AP' is usually a slogan rather than a design."
publishedAt: "2026-07-11"
updatedAt: "2026-09-16"
category: "System Design"
tags:
  - System Design
  - Distributed Systems
  - Consistency
  - Databases
sources:
  - title: "Brewer's Conjecture and the Feasibility of Consistent, Available, Partition-Tolerant Web Services"
    author: "Seth Gilbert and Nancy Lynch"
    publisher: "ACM SIGACT News, 2002"
    url: "https://dl.acm.org/doi/10.1145/564585.564601"
  - title: "CAP Twelve Years Later: How the 'Rules' Have Changed"
    author: "Eric Brewer"
    publisher: "IEEE Computer, 2012"
    url: "https://www.infoq.com/articles/cap-twelve-years-later-how-the-rules-have-changed/"
---

CAP is the most-quoted and least-precisely-used idea in backend interviews. The theorem is not "pick two of three forever." Gilbert and Lynch formalized Brewer's conjecture for a specific model: a distributed system that must respond to reads and writes, during a **network partition**, cannot be both linearly consistent and available for every request.

If the network is healthy, you can have consistency and availability together. Partitions are the case the theorem cares about. That single clause is what most whiteboard slogans drop.

## The three letters, tightly

**Consistency** in the proof is linearizability: there is a single order of operations that looks like one copy of the data. **Availability** means every request to a non-failing node eventually receives a response, without being told "not the leader, try later" forever. **Partition tolerance** means the system continues despite some messages being dropped or delayed between nodes.

You do not get to decline partition tolerance on a real WAN. Packets get delayed. The practical choice during a split is: refuse some operations (keep one copy correct) or serve stale or conflicting answers (stay available).

```text
Partition:  East cannot talk to West

CP-shaped:  East is leader, West returns errors or redirects
AP-shaped:  both sides accept writes, repair later (version vectors, CRDTs, last-write-wins)
```

Dynamo-style stores leaned AP for shopping carts: a missing item is worse than a mergeable conflict. Spanner leans toward CP for money-shaped data, and spends an extraordinary amount of engineering (TrueTime) to make the "C" cheaper across datacenters. Both are legitimate; neither is "the CAP theorem made us."

## PACELC and the rest of the time

Daniel Abadi's PACELC reminder is the useful follow-up: even when there is no partition (**Else**), you still trade latency for consistency. A quorum read that waits for a majority is slower than reading the nearest replica. Teams that say "we are AP" often mean "we optimized nearest-replica reads," which is an ELC decision, not a partition decision.

Latency-vs-consistency is where most product arguments belong. Partitions are rare; extra milliseconds on every read are not.

## How to use CAP in a design review without hand-waving

Name the operation. "User profile display" and "debit this ledger" are different. Name the failure. "This AZ is unreachable for two minutes" is a partition; "this node is slow" is not. Name the user-visible behavior. "Show a 5-second-old follower count" is a consistency relaxation with a bound; "both sides of a split accepted a unique username" is a conflict you will pay for in support tickets.

If you cannot describe the repair path — merge, rewind, human, or "this key is immutable" — you have not chosen AP. You have chosen undefined behavior with a marketing label.

Brewer's 2012 retrospective is worth reading after the 2002 proof. He spends most of it walking back the slogan and talking about latency, overlapping operations, and systems that are mostly consistent except for a few carefully fenced writes. That is closer to how mature platforms actually run than a triangle drawn on a whiteboard.

## A worked example

A two-node register during a partition: AP: both accept writes, merge later (LWW or CRDT). CP: one side refuses writes (Raft leader unreachable). You pick CP for bank balances, AP for typing indicators. The theorem is about *linearizability vs availability during partition*, not "we chose Mongo so we cannot have consistency."

A chaos test: pull the network cable and record which API still 200s and whether a subsequent read on the other side sees the write.

## Failure modes

Citing CAP to skip transactions on a single-node Postgres. Claiming CA as a third mode in a partition (you gave up partition tolerance, i.e. a single machine). Mixing "eventual consistency" as a lifestyle with no merge rule. Using CAP for liveness bugs that are just slow disks.

"We're CP" while clients retry on a timeout and double-spend.

## When this is the wrong tool

CAP is the wrong slide for "should we use Kafka." It is not a capacity planning tool. Single-region RDBMS with synchronous replica in the same AZ is a different discussion (latency, not partition of the WAN). PACELC is a better follow-up when you care about latency vs consistency *without* a partition. Do not design from the acronym; design the conflict rule, then name it.
