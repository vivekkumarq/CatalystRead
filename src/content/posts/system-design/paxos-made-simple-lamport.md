---
title: "Paxos Made Simple: What Lamport Actually Asks You to Implement"
slug: "paxos-made-simple-lamport"
description: "A working engineer's reading of Lamport's 2001 note: prepare/accept, majority quorums, and why Multi-Paxos still leaks into every consensus library."
publishedAt: "2026-08-13"
category: "System Design"
tags:
  - System Design
  - Distributed Systems
  - Consensus
  - Paxos
sources:
  - title: "Paxos Made Simple"
    author: "Leslie Lamport"
    publisher: "ACM SIGACT News, 2001"
    url: "https://lamport.azurewebsites.net/pubs/paxos-simple.pdf"
  - title: "The Part-Time Parliament"
    author: "Leslie Lamport"
    publisher: "ACM TOCS, 1998"
    url: "https://lamport.azurewebsites.net/pubs/lamport-paxos.pdf"
---

Leslie Lamport's "Paxos Made Simple" is fourteen pages that still show up in design reviews as a talisman. The paper does not give you a database. It specifies how a set of processes can agree on **one value** despite crash-stop failures and arbitrary message delay, as long as a majority of acceptors remain reachable long enough. If you remember only that sentence, you already know more than the slide that says "we use Paxos."

## Roles, not machines

The protocol names three roles: **proposers**, **acceptors**, and **learners**. One JVM process usually plays all three. Confusing the roles with "the three nodes in our AZ" is how people invent illegal optimizations. Safety lives in the acceptors' persistent state: the highest prepare they have promised, and the highest-numbered proposal they have accepted.

A proposal is a pair `(n, v)` — a ballot number and a value. Ballot numbers must be unique across proposers. Implementations typically pack a node id into the low bits of `n` so two leaders never mint the same ballot.

## Two phases, one invariant

**Phase 1 (prepare).** The proposer sends `prepare(n)` to a majority of acceptors. An acceptor that has not promised a higher ballot replies with the highest-numbered proposal it has already accepted, if any, and promises to ignore smaller ballots. After a majority answers, the proposer must choose a value: if any reply carried an accepted proposal, it is **required** to propose the value from the highest-numbered of those. Only if none did may it pick its own value (the client command).

**Phase 2 (accept).** The proposer sends `accept(n, v)` to a majority. Acceptors that still honor `n` record `(n, v)`. Once a majority has accepted, `v` is chosen. Learners hear about it via a distinguished learner, extra broadcasts, or by piggybacking on later messages.

That "must reuse the highest accepted value" rule is the whole safety argument. It is also why a restarting proposer cannot "just propose my write" after a network blip: someone else may already have a chosen value hiding in a majority you have not talked to yet.

```text
Acceptor A: promised=5, accepted=(4, "x=1")
Acceptor B: promised=5, accepted=none
Acceptor C: promised=3, accepted=(2, "x=0")

Proposer with n=6 hears A and B: must propose v="x=1"
```

## From single-decree to a log

Production systems need a sequence of commands. **Multi-Paxos** runs the algorithm once per log slot, with a stable leader that skips Phase 1 after it has established a high ballot. The leader still must run Phase 1 after a failover, because it does not know which slots already have chosen values. etcd-era engineers meet this as "Raft is Paxos with a stronger leader story"; the accept-log is the same species of state.

What the simple paper will not tell you: how to store acceptor state without lying after a crash, how to garbage-collect chosen slots, how to change membership, or how to serve linearizable reads. Disks that acknowledge before fsync, or "learners" that apply before a majority accept, are not Paxos with extra steps. They are a different protocol that happens to use the same words.

## Failure modes you will actually page on

A proposer that increments ballots on every timeout livelocks the cluster: every competing `prepare` aborts in-flight `accept`s. Randomized backoff is not optional decoration. A majority that spans one rack means the protocol is correct and the service is down. Learners that lag look like "consensus is slow" when the bottleneck is apply, not agreement.

If a design review cannot point to majority quorums, persistent promises, and the value-selection rule, it is not implementing Paxos. It is implementing hope with extra RPCs.

Read the invariant once, then read your WAL code. The paper is short because the contract is small. Everything else is product.
