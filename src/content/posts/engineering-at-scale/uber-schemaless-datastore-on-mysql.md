---
title: "Schemaless: How Uber Scaled MySQL Instead of Abandoning It"
slug: "uber-schemaless-datastore-on-mysql"
description: "Why Uber built Schemaless, an append-only document layer on top of sharded MySQL, instead of migrating wholesale to a NoSQL database."
publishedAt: "2025-10-07"
updatedAt: "2026-09-16"
category: "Uber"
tags:
  - Engineering at Scale
  - Uber
  - Databases
  - MySQL
sources:
  - title: "Designing Schemaless, Uber Engineering's Scalable Datastore Using MySQL"
    publisher: "Uber Engineering Blog"
    url: "https://www.uber.com/blog/engineering/"
---

As Uber's trip volume grew, its early datastores hit the scaling wall that eventually catches every fast-growing company: a single relational database, or even a simply sharded one, couldn't keep up with write volume and dataset size, and the operational team that had to run it was spending too much time on manual resharding and capacity firefighting. The industry-standard answer at the time was "migrate to a NoSQL database," but Uber's engineers made a different call: keep MySQL, and build a scalable datastore layer, called Schemaless, on top of it.

## An append-only document store, backed by ordinary MySQL

Schemaless presents applications with a simple, flexible API: it stores schemaless JSON documents (or "cells") keyed by an item identifier, a column name, and an ordered ref key, and writes are append-only rather than in-place updates — a new write for a given key creates a new versioned cell instead of overwriting the previous one. That append-only model is deliberately similar in spirit to the immutable, versioned-cell approach in Bigtable's data model, though Schemaless was purpose-built to sit on top of sharded MySQL rather than a distributed file system.

Underneath that flexible API, Schemaless data is horizontally partitioned across many MySQL shards, and the datastore layer handles routing a given key to the correct shard, so from an application's perspective it looks like one large, horizontally scalable document store even though the actual storage engine underneath every shard is unmodified, boring, well-understood MySQL.

## Why not just move to NoSQL

The appeal of building Schemaless instead of adopting an off-the-shelf NoSQL database came down to operational trust and familiarity. Uber's infrastructure and database operations teams already had deep operational experience running MySQL reliably — backup strategies, replication, monitoring, tooling for diagnosing slow queries — and a wholesale migration to an unfamiliar NoSQL system would have meant rebuilding that operational maturity from scratch while simultaneously trying to solve the original scaling problem. Building a scaling layer on top of a well-understood storage engine let Uber keep that operational maturity while still getting the horizontal scalability and flexible schema its application teams needed.

It also sidestepped a common NoSQL migration risk: giving up transactional guarantees and tooling maturity that a mature relational engine provides, in exchange for scalability that a home-grown layer could arguably deliver on top of the same relational engine anyway, if the sharding and routing problem was solved well.

## A foundation, not a final answer

Schemaless became foundational infrastructure at Uber for a period, underpinning several core services, and it directly informed the design of Uber's later-generation storage systems, which continued to build higher-level datastore abstractions on top of proven lower-level storage engines rather than chasing the latest storage technology for its own sake. The broader lesson Uber's engineering blog drew from the Schemaless era was less about MySQL specifically and more about a general principle: scaling problems are often solvable with a well-designed layer on top of infrastructure you already trust, rather than requiring you to throw out that infrastructure entirely.

## Operational gotchas of Schemaless-on-MySQL

Uber's Schemaless put JSON-ish documents on sharded MySQL to iterate without DDL on every field, while keeping MySQL's operational comfort. The failure mode is schemaless becoming schema-less: every producer writes different keys for "driver_id," and readers guess. Mid-size steal: JSON columns with a version field and a validator at write time, not a free-for-all.

The concrete failure mode is an index you cannot add because the field is buried in JSON, so you scan. Promote hot fields to columns on a schedule. Operational gotcha: wide documents that blow row size and replication. Cap. Dual-write between old tables and Schemaless during migration without idempotency will duplicate trips. Another is secondary indexes that are eventually consistent while the primary row is not; product reads the index and 404s the document. Document the lag. MySQL still needs schema changes for the envelope — shard key, indexes — so you did not escape migrations, you delayed them. Steal the envelope-and-payload pattern. Do not steal a custom datastore name until vanilla JSONB plus a few generated columns is on fire. Watch the super-row: a trip that accumulates every event forever. Archive to cold storage. Schemaless is an API discipline sitting on SQL, and the discipline is the hard part.

## What you can borrow

- Before migrating to a fundamentally different storage technology, ask whether a scaling layer on top of your current, well-understood engine could get you there instead.
- Operational maturity with a boring technology has real value — don't discount it when evaluating a flashier alternative.
- An append-only, versioned-write model sidesteps a lot of update-in-place complexity and concurrency headaches, at the cost of needing a compaction or garbage-collection strategy.
- Horizontal sharding logic doesn't have to live inside the database engine itself — a well-designed application-level routing layer can add scalability the underlying engine wasn't originally built for.
