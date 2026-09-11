---
title: "Why Uber Walked Away From Postgres"
slug: "uber-postgres-to-mysql-migration"
description: "The write amplification, replication, and connection-handling problems that pushed Uber off Postgres and onto a MySQL-based storage stack."
publishedAt: "2025-05-14"
category: "Uber"
tags:
  - Engineering at Scale
  - Uber
  - Databases
  - MySQL
sources:
  - title: "Why Uber Engineering Switched from Postgres to MySQL"
    publisher: "Uber Engineering Blog"
    url: "https://www.uber.com/blog/engineering/"
---

Uber's earliest production database was Postgres, chosen the way most young startups choose a database: it was familiar, capable, and good enough to launch with. A few years and an explosion of trip volume later, Uber's engineering team published one of the more widely discussed database migration stories in the industry — a move off Postgres and onto a schema-on-top-of-MySQL stack. The post ruffled feathers in the Postgres community at the time, partly because Uber's reasoning was specific to its own replication topology and write patterns rather than a blanket claim that MySQL is universally better. Understanding what actually went wrong is more useful than the headline.

## Write amplification from indexing and MVCC

Postgres implements MVCC (multi-version concurrency control) by writing a new row version on every update, and by default it also touches every index on a table when a row changes, even if the changed column isn't indexed, because each index needs a pointer to the new row version. For write-heavy tables with several secondary indexes — common in a trip and dispatch data model — that meant a single logical update generated disproportionate physical write volume across the underlying storage. MySQL's InnoDB engine, by contrast, uses a clustered primary-key index and updates secondary indexes more narrowly, which produced markedly less write amplification for Uber's access patterns.

## Replication that didn't fit the failure model

At the time, Postgres's replication was physical: it shipped raw data-file changes to replicas, which meant a replica had to be running compatible binaries and the replication stream carried disk-level detail rather than logical row changes. Uber's operational needs included things like being able to run different index sets on replicas, or take a replica through maintenance without a full resync — flexibility that logical replication (available natively in MySQL's binlog-based approach at the time) supported more naturally. Uber's engineers also found the tooling and community experience around diagnosing MySQL replication issues to be more mature for their operational scale.

## Connection handling under a stateless fleet

Uber's stateless application fleet meant a large number of application processes opening and closing database connections continuously, and Postgres's process-per-connection model made that expensive: each connection is a full OS process, with real memory overhead, so scaling connection counts requires a separate pooler such as PgBouncer sitting in front of the database. MySQL's thread-per-connection model handled Uber's connection churn more cheaply out of the box, which mattered at the connection volumes Uber's fleet was generating.

## The reaction, and the nuance that got lost

The original blog post drew significant pushback from the Postgres community, who pointed out — correctly — that several of the issues Uber described had been addressed or were addressable through configuration, extensions, or newer Postgres versions, and that MySQL has its own well-known sharp edges. Uber's engineers were fairly transparent that this wasn't a claim that MySQL is categorically superior; it was that MySQL's specific behavior matched their specific replication topology, write patterns, and connection model better at the time they evaluated it. The migration went on to underpin later Uber storage systems, including the sharded-MySQL-backed Schemaless datastore.

## What you can borrow

- Benchmark database write amplification against your actual index layout and update patterns, not generic vendor claims — the "same" workload can behave very differently under MVCC versus clustered-index engines.
- Match a database's replication model to your operational failure recovery needs, not just its steady-state performance.
- Connection-handling cost scales differently across database engines; a stateless, high-churn application fleet has different requirements than a small number of long-lived connections.
- Publish migration rationale carefully — "this fit our specific constraints" and "this technology is categorically better" read very differently to an audience, and only one of them is usually true.
- Revisit old infrastructure decisions periodically; database engines evolve, and a tradeoff that was decisive years ago may no longer hold.
