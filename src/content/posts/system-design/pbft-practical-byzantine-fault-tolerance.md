---
title: "PBFT: Practical Byzantine Fault Tolerance When Nodes Can Lie"
slug: "pbft-practical-byzantine-fault-tolerance"
description: "Castro and Liskov's PBFT: 3f+1 replicas, three-phase agreement, and when crash-fault Raft is the wrong threat model."
publishedAt: "2026-09-18"
category: "System Design"
tags:
  - System Design
  - Consensus
  - Byzantine Fault Tolerance
  - Distributed Systems
sources:
  - title: "Practical Byzantine Fault Tolerance"
    author: "Miguel Castro and Barbara Liskov"
    publisher: "OSDI 1999"
    url: "https://pmg.csail.mit.edu/papers/osdi99.pdf"
  - title: "Practical Byzantine Fault Tolerance and Proactive Recovery"
    author: "Miguel Castro and Barbara Liskov"
    publisher: "ACM TOCS, 2002"
    url: "https://pmg.csail.mit.edu/papers/bft-tocs.pdf"
---

Most clustered databases assume replicas **crash or pause**, they do not **equivocate**. Castro and Liskov's Practical Byzantine Fault Tolerance (OSDI 1999) targets the other threat: a replica may send different votes to different peers, replay old messages, or collude — up to `f` such faults — while the rest follow the protocol. The headline math is **`3f+1` replicas** to tolerate `f` Byzantine faults, not the `2f+1` of crash-fault Paxos.

That extra third is not a tax for fun. In a crash model, a majority overlap guarantees that two quorums share an honest, persistent acceptor. In a Byzantine model, a majority of `2f+1` could overlap only on a liar. You need quorums large enough that two quorums share an honest replica even after subtracting `f` traitors.

## Three phases around a primary

PBFT uses a **primary** to assign sequence numbers. Clients send requests to the primary; the primary assigns a seq and broadcasts a `pre-prepare`. Backups broadcast `prepare`. When a replica has `2f` matching prepares plus its own (a prepared certificate), it broadcasts `commit`. When it has `2f+1` commits, it executes the request and replies to the client. The client waits for `f+1` identical replies so that at least one honest replica executed the same result.

```text
pre-prepare  →  prepare (agree on order)  →  commit (agree to execute)
view-change  →  new primary if the old one is silent or diverging
```

View changes are the operational nightmare. If the primary is slow or malicious, backups collect evidence and move to a new view, carrying prepared requests so they are not lost. A malicious primary that equivocates but stays just fast enough is harder than a crash. Timeouts again sneak in; PBFT is practical because it assumes partial synchrony for liveness, like everyone else.

## Where this shows up outside papers

Permissioned blockchains, some certificate transparency designs, and research filesystems (Castro and Liskov's NFS prototype in the paper) used PBFT or cousins. Public proof-of-work and proof-of-stake systems solve a different problem (open membership, sybil resistance) and should not be described as "just PBFT." HotStuff and later BFT protocols reduce phases or pipelining; they still pay `3f+1` in the classic authenticated-channel model.

Do not run PBFT in front of a Postgres that already has a crash-fault primary. Byzantine protocols are for when **operators of replicas do not trust each other**, or when a compromised host should not silently fork state. Inside one company's VPC with a shared IAM boundary, crash-fault Raft plus good identity is usually the rational threat model. Mixing them — "we're BFT because we have three AZs" — confuses independence of failures with independence of administrators.

## Costs you will feel

MACs or signatures on each phase, extra replicas, and view-change complexity dominate. Speculative execution variants improve latency when the primary is honest. Checkpointing and garbage collection of logs are mandatory or memory dies.

If a vendor says "Byzantine fault tolerant" , ask: `f` of what, `3f+1` of what, and who holds the signing keys. Castro and Liskov gave a protocol you can implement. They did not give you a reason to ignore crash-fault tools when the adversary cannot send two different prepares.
