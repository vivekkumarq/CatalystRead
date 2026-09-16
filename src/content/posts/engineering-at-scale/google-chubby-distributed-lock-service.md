---
title: "Chubby: The Lock Service That Quietly Holds Google Together"
slug: "google-chubby-distributed-lock-service"
description: "How Google's Chubby lock service solved distributed coordination and became the foundation GFS, Bigtable, and countless internal systems depend on."
publishedAt: "2025-07-03"
updatedAt: "2026-09-16"
category: "Google"
tags:
  - Engineering at Scale
  - Google
  - Distributed Systems
  - Coordination
sources:
  - title: "The Chubby lock service for loosely-coupled distributed systems"
    author: "Mike Burrows"
    publisher: "OSDI 2006"
    url: "https://research.google"
---

Almost every distributed system eventually runs into the same small, deceptively hard problem: how do a bunch of independent processes agree on who's in charge of something, or reliably find each other, without a human in the loop and without splitting into two groups that both think they're right? Building correct consensus from scratch — the way Paxos requires — is hard enough that most engineers shouldn't attempt it per-project. Google's answer was to build it once, correctly, and expose it as a service. That service was Chubby, described by Mike Burrows in the 2006 OSDI paper "The Chubby lock service for loosely-coupled distributed systems," and it quietly became the coordination backbone underneath GFS, Bigtable, and a long list of other internal systems.

## A file system, not a lock API

Chubby's cleverest design decision was presenting itself to application developers as something they already understood: a small, simple, hierarchical file system, with locks tied to files and directories rather than exposed as an unfamiliar locking primitive. Clients open a "file" the way they'd open a file anywhere else, and that file doubles as a lock — acquiring it, holding it, releasing it. This mattered because most engineers at Google already had file-system intuitions, so adopting Chubby for coordination didn't require learning a new mental model, which in turn meant teams actually used it correctly instead of rolling their own ad hoc coordination logic.

Underneath that familiar interface, Chubby ran Paxos-based distributed consensus across a small replica set — typically five replicas — electing a master that handled client requests, with the other replicas standing by to take over if it failed. That gave Chubby strong consistency guarantees and high availability without every team at Google needing to understand or implement consensus themselves.

## Leader election and the "lock server as directory" pattern

Beyond simple mutual exclusion, Chubby became Google's default mechanism for leader election: a group of replicas of some service would all try to acquire a specific Chubby lock, exactly one would succeed, and that one became the leader — a pattern reused across dozens of internal systems rather than reinvented each time. GFS used Chubby to elect its master and to store a small amount of critical metadata reliably; Bigtable used it for master election, server discovery, and to ensure at most one active master existed at any time, preventing the kind of split-brain scenario that silently corrupts distributed systems.

Chubby also functioned as a small, highly available store for configuration data that needed to be consistently visible across a cluster — not a general-purpose database, but reliable enough and simple enough that "just put it in Chubby" became a standard answer for small pieces of critical shared state. Its design directly shaped later open-source coordination services: Apache ZooKeeper, and subsequently etcd (which underlies Kubernetes), both cover essentially the same problem space Chubby staked out first.

## What broke when they scaled

Ad-hoc locks in files and databases do not give you distributed election. Chubby (Burrows, OSDI 2006) is a coarse-grained lock service with a filesystem-like API, backed by Paxos, used so GFS masters, Bigtable, and others can elect a primary and store a little metadata. What breaks a Chubby-like service is using it as a high-QPS database — it is for locks and small files, not for your request path. Client caching of Chubby nodes, keepalives, and session expiry are the mechanics: a network blip that expires thousands of sessions is a herd of re-elections.

Google's paper is explicit that Chubby's availability is load-bearing. A Chubby outage looks like a company-wide coordination outage. ZooKeeper is the open-source cousin (different API, same niche). etcd/Consul filled the Kubernetes-era niche. Putting high-rate writes on ZooKeeper is the classic scaling mistake.

## A smaller-team version of the same idea

Use ZooKeeper/etcd for leader election and a small amount of config. Keep ephemeral nodes for liveness. Do not store your application catalog there. Lease timeouts should exceed GC pauses and short partitions. If you have one primary Postgres, you may not need Chubby at all.

## What you can borrow

- Build (or adopt) coordination primitives once, correctly, rather than letting every team hand-roll leader election or distributed locking — those bugs are subtle and expensive to debug in production.
- Expose complex distributed guarantees through a familiar interface (Chubby chose a file system) so engineers adopt it correctly without needing to understand the consensus algorithm underneath.
- Use a coordination service for leader election explicitly — "acquire this lock, whoever succeeds is the leader" — rather than building bespoke election logic per service.
- Keep the coordination layer small and focused on locks, election, and small configuration values; don't let it become a general-purpose database, which changes its availability and consistency tradeoffs.
- If you're not at Google's scale, tools like ZooKeeper, etcd, or even a managed equivalent give you Chubby's core guarantees without building consensus in-house.
