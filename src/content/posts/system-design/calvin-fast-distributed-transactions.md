---
title: "Calvin: Fast Distributed Transactions by Sequenced Determinism"
slug: "calvin-fast-distributed-transactions"
description: "Thomson, Diamond, Weng, Ren, Shao, and Abadi, SIGMOD 2012: agree on input order, then execute lock-free replicas in lockstep."
publishedAt: "2026-08-28"
category: "System Design"
tags:
  - System Design
  - Distributed Transactions
  - Databases
  - Consensus
sources:
  - title: "Calvin: Fast Distributed Transactions for Partitioned Database Systems"
    author: "Alexander Thomson, Thaddeus Diamond, Shu-Chun Weng, Kun Ren, Philip Shao, Daniel J. Abadi"
    publisher: "SIGMOD 2012"
    url: "https://cs.yale.edu/homes/thomson/publications/calvin-sigmod12.pdf"
  - title: "The Case for Determinism in Database Systems"
    author: "Alexander Thomson and Daniel J. Abadi"
    publisher: "VLDB 2010"
    url: "https://cs.yale.edu/homes/thomson/publications/determinism-vldb10.pdf"
---

Two-phase commit is the instinctive distributed transaction: vote, then decide. Calvin (Thomson et al., SIGMOD 2012) attacks a different bottleneck. After you have a **global order** of incoming transaction requests, every replica can apply the same deterministic schedule and finish without a second coordination round for the data. Consensus moves to the **input sequencer**, not to every lock.

## Order first, execute second

Clients submit transaction logic (or a stored procedure name plus arguments) to a sequencer. The sequencer, itself replicated, batches requests into epochs and assigns a total order. Workers receive the batch, **analyze read/write sets** (declared up front, or discovered carefully), acquire locks in a deterministic order, execute, and release. Because every replica sees the same batch in the same order, they do not need to agree again on commit versus abort for serializable outcomes of deterministic code.

```text
client → sequencer (Paxos/Raft on batches)
       → replicas execute batch i identically
       → replicas do not 2PC the business writes
```

The catch is **determinism**. Non-deterministic SQL (`NOW()`, random, reads of data you did not lock, thread scheduling that changes write sets) breaks replica equivalence. Calvin wants transactions that look like stored procedures with declared partition touch sets. Interactive "read a row, think, write another row" chatty transactions fit poorly unless you re-plan after a reconnaissance read.

## Why this is faster than classic 2PC — and when it is not

Classic 2PC holds locks across a network round trip to a coordinator. Tail latency of that round trip becomes the lock hold time, which collapses throughput under contention. Calvin holds locks during local deterministic execution after the batch is known. Contention still serializes, but you are not paying WAN RTT per commit.

If the sequencer is far from clients, you paid a WAN RTT **before** execution. Geography still exists. Calvin shines when replicas are in a datacenter or a well-connected region and the workload is stored-procedure shaped. It is a weaker fit for ad-hoc ORMs that touch unknown keys after seeing query results.

Fauna historically marketed Calvin-style execution. FoundationDB is not Calvin; it is ordered by a sequencer of a different design. Spanner is TrueTime plus 2PC. The paper is useful because it separates **agreement on inputs** from **agreement on effects**. Many "distributed transaction" debates mix those.

## Design-review questions

Can you name write sets before execution? Is the transaction code deterministic? What is the epoch size versus latency SLO? What happens when a replica is slow — do you stall the world on the batch? How do you do schema changes without breaking determinism?

If the answer to write sets is "the ORM will figure it out," Calvin is not what you are building. You may still want a sequenced log of commands (event sourcing, Kafka compacted topics) without pretending you have Calvin's replica equivalence.

Read SIGMOD 2012's comparison to 2PC under contention. Then look at your lock traces. If they are dominated by coordinator delay, sequencing plus determinism is a real lever. If they are dominated by hot keys, no scheduler will save you from a single-row hotspot.
