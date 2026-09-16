---
title: "Cassandra and the Dynamo Lessons Amazon Published First"
slug: "cassandra-amazon-dynamo-lessons"
description: "How Lakshman and Malik's SIGOPS 2010 Cassandra paper took Dynamo's consistent hashing, hinted handoff, and tunable quorum into a wide-column store."
publishedAt: "2026-08-16"
category: "System Design"
tags:
  - System Design
  - Cassandra
  - Dynamo
  - Distributed Systems
sources:
  - title: "Cassandra: A Decentralized Structured Storage System"
    author: "Avinash Lakshman and Prashant Malik"
    publisher: "ACM SIGOPS Operating Systems Review, 2010"
    url: "https://www.cs.cornell.edu/projects/ladis2009/papers/lakshman-ladis2009.pdf"
  - title: "Dynamo: Amazon's Highly Available Key-value Store"
    author: "Giuseppe DeCandia et al."
    publisher: "SOSP 2007"
    url: "https://www.allthingsdistributed.com/files/amazon-dynamo-sosp2007.pdf"
---

Facebook's inbox search needed to write a lot, survive datacenter mishaps, and stay online when a replica was down. Avinash Lakshman and Prashant Malik described Cassandra in 2010 as a decentralized store that borrowed Amazon Dynamo's membership and replication ideas and married them to a Bigtable-style data model. If you only remember "Cassandra is AP," you will mis-tune quorum and then blame the database.

## Dynamo's ring, Cassandra's columns

Dynamo showed that **consistent hashing** plus virtual nodes lets you add capacity without reshuffling the whole keyspace, and that **sloppy quorum** with hinted handoff keeps writes accepted when the "right" replica is sick. Cassandra kept the token ring and gossip membership. Keys hash to tokens; each key lives on `RF` successive nodes on the ring. There is no leader for a row in the Dynamo sense: any replica can coordinate a request.

The data model is not a blob KV. Rows have column families; columns are name/value pairs ordered by name, which made inbox search and later time-series patterns natural. That is why Cassandra looks like a distributed map of sorted maps, not like Redis.

## Tunable consistency is a client choice, not a slogan

A read or write specifies a consistency level: `ONE`, `QUORUM`, `LOCAL_QUORUM`, `ALL`. Dynamo's insight was `R + W > N` for overlapping quorums. Cassandra operators still get this wrong in two directions. Setting everything to `ONE` maximizes availability and maximizes the chance that a client reads a value another client never saw. Setting everything to `ALL` makes a single slow replica your p99.

```text
N = 3, W = QUORUM, R = QUORUM  →  overlapping majority, last-write-wins per cell
N = 3, W = ONE,    R = ONE     →  hinted handoff and read repair become load-bearing
```

Conflict resolution is last-write-wins with client timestamps (and later server-side timestamps). That is not CRDTs. Clock skew can resurrect an old column. Application-level timestamps and idempotent writes matter more here than in a linearizable SQL store.

## What the paper's architecture implies on-call

**Commit log + memtable + SSTables** is the LSM path. Compaction is not a background courtesy; it is how reads stay cheap. If compaction cannot keep up, you pay with tombstone storms and unbounded read latency — a failure mode Dynamo's original shopping-cart paper did not have to foreground the same way.

**Gossip** spreads ring state. A partition that heals with conflicting schemas or tokens is an ops event, not a theoretical footnote. **Hinted handoff** stores writes for a down replica on a coordinator; if hints overflow or coordinators die, you rely on anti-entropy repair. Teams that disable repair because it is expensive discover why Dynamo spent pages on Merkle trees.

Cassandra's 2010 claim is still the product claim: you can scale writes by adding nodes, you can survive replica loss, and you will not get serializable transactions as a free gift. Lightweight transactions (Paxos per partition) arrived later for a reason. Use them for uniqueness constraints, not for a general OLTP workload you wish was Spanner.

When you choose Cassandra today, you are choosing Dynamo's availability math plus LSM operational load. Read Lakshman and Malik for the ring and the column API. Read DeCandia et al. for why hinted handoff exists. Then budget for repair, compaction, and the consistency level your product actually meant.
