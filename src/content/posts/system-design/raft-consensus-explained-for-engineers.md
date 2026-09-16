---
title: "Raft Consensus, Explained for Engineers Who Have to Operate It"
slug: "raft-consensus-explained-for-engineers"
description: "What the Raft paper actually guarantees, how leader election and log replication work, and the operational failure modes etcd and Consul still hit."
publishedAt: "2026-07-08"
category: "System Design"
tags:
  - System Design
  - Distributed Systems
  - Consensus
  - Reliability
sources:
  - title: "In Search of an Understandable Consensus Algorithm"
    author: "Diego Ongaro and John Ousterhout"
    publisher: "USENIX ATC 2014"
    url: "https://raft.github.io/raft.pdf"
  - title: "The Raft Consensus Algorithm"
    publisher: "raft.github.io"
    url: "https://raft.github.io/"
---

Paxos is famous for being correct and infamous for being hard to teach. Diego Ongaro and John Ousterhout designed Raft so a working engineer could implement leader election, log replication, and safety without a theory seminar. If you run Kubernetes, you already depend on it: etcd's cluster is a Raft group. Consul, CockroachDB's range leases, and a long list of "we replicated this metadata" services sit on the same algorithm.

The guarantee is narrow and easy to misuse. Raft agrees on a **sequence of log entries**. It does not make your application linearizable by itself, does not replicate large blobs cheaply, and does not survive a majority of nodes disappearing. Treat it as a replicated state machine for small, critical metadata — membership, configuration, the head of a stream — not as a general database.

## Terms, logs, and why a leader exists

Time is divided into **terms**, monotonically increasing integers. At most one leader is elected per term. Clients send writes to the leader; the leader appends them to its log and ships `AppendEntries` RPCs to followers. An entry is **committed** once a majority of servers have stored it. Only then may the leader apply it to the state machine and acknowledge the client.

```text
Leader log:   [1:set x=1] [1:set y=2] [2:set x=3]
Follower A:   [1:set x=1] [1:set y=2]
Follower B:   [1:set x=1] [1:set y=2] [2:set x=3]
                      ^ committed up to index 2 if majority has it
```

The safety rule that matters in production: a newly elected leader must have all committed entries from previous terms. Raft enforces this in the election: a candidate only wins if its log is at least as up-to-date as a majority of voters (compared by last-entry term, then index). That rule is why you cannot "just add a blank node and let it become leader" without catching up first.

## Leader election is a timeout, not magic

Followers expect heartbeats. If a follower's election timeout fires, it becomes a candidate, increments its term, votes for itself, and requests votes. Randomized timeouts are not a cute animation in the Raft visualization — they are how the algorithm avoids split votes when several nodes time out together. If you set every node's timeout to the same 150ms in a slow network, you will get flapping elections and a cluster that spends more time campaigning than serving.

Operational translation: election timeout must be several times the typical RPC RTT, and heartbeat interval must be several times smaller than the timeout. Cloud networks with occasional 200ms hiccups need slower timeouts than a rack-local etcd. Tuning this poorly looks like "random leadership changes" in dashboards.

## Membership changes are the sharp edge

The original paper's joint-consensus membership change exists because adding or removing a node changes what "majority" means, and doing it naively can elect two leaders. Most production Raft libraries expose add-voter / remove-voter APIs that implement this carefully. The failure mode you will actually hit is more mundane: a node is replaced with a new disk, rejoins with an empty log, and if you force it into the quorum before it snapshots, you shrink effective durability.

Snapshots exist so followers do not replay a multi-gigabyte log. If snapshotting is slow or disabled, catch-up never finishes and the cluster cannot replace members. That is an ops problem with a paper-shaped cause.

## What Raft will not save you from

- **Disk not fsynced.** If the implementation acknowledges before the log hits stable storage, a power loss can violate the safety the paper assumes. etcd's wal fsync settings are a production decision, not a default to ignore.
- **Clock-dependent leases without fencing.** Many databases layer a leader lease on Raft for read locality. A long GC pause can make two processes believe they hold the lease unless you fence with the Raft term or a similar epoch.
- **Using Raft for bulk data.** Shipping application records through the Raft log turns consensus into your write bottleneck. The usual pattern is: Raft decides the metadata (who owns the shard, where the files live); the bytes go elsewhere.

If you need a mental test for a design review: "If I kill the leader and a follower with a slightly shorter log, can a stale value become committed?" If the answer is not an immediate no with a pointer to the up-to-date election rule, the implementation is not Raft, it is a gossip of logs.

Read the paper's figures for leader election and log matching once. They are clearer than most blog diagrams, and they are the contract your on-call runbook is actually enforcing.
