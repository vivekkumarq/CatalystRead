---
title: "The HBase Era: When Pinterest Served Boards and Pins from Wide-Column Storage"
slug: "pinterest-hbase-era-wide-column-storage"
description: "A look back at the years Pinterest ran core data on HBase, why the wide-column model fit some of its access patterns, and where the friction showed up."
publishedAt: "2025-10-12"
updatedAt: "2026-09-16"
category: "Pinterest"
tags:
  - Engineering at Scale
  - Pinterest
  - HBase
  - Databases
---

Before Pinterest settled into the sharded MySQL architecture that would ultimately serve it for the long run, the company went through a period of running significant parts of its data infrastructure on HBase, the wide-column store built on top of Hadoop's distributed filesystem. The appeal at the time was straightforward: Pinterest's data was growing fast, HBase promised horizontal scalability without the manual sharding work relational databases demanded, and its data model — sparse, wide rows keyed for fast lookup — seemed to map naturally onto some of Pinterest's core access patterns, like fetching all the pins on a board or all the boards for a user.

## Why the wide-column model looked like a fit

HBase organizes data as rows identified by a key, with columns grouped into families and no requirement that every row share the same columns — a structure well suited to data that's naturally sparse or where the schema varies row to row. For something like a user's activity feed or a board's collection of pins, this looked like a reasonable match: a row keyed by user or board ID, with columns representing individual pins or events, retrievable efficiently by scanning a contiguous key range. Combined with automatic region splitting as tables grew, HBase offered a path to scale storage and throughput horizontally without Pinterest's engineers manually deciding how to shard data across servers themselves, which was an attractive proposition for a fast-growing team without deep in-house sharding infrastructure yet.

```text
Row key: board_id
Column family: pins
  pin:1001 -> {timestamp, metadata}
  pin:1002 -> {timestamp, metadata}
  ...
```

## Where the friction accumulated

Running on HBase also meant running on the broader Hadoop ecosystem's operational model, which came with real costs: HBase's consistency and latency characteristics under Pinterest's actual production read and write patterns didn't always match what the access-pattern-level design suggested on paper, and operating a healthy HBase cluster — region server behavior, compactions, garbage collection pauses on the underlying JVM — demanded specialized operational expertise that had to be built up and maintained. Point lookups and range scans that looked clean in the data model sometimes came with latency and operational tail-risk that a well-tuned relational setup, with a team that already deeply understood it, didn't carry to the same degree.

Pinterest's engineers found themselves increasingly investing operational effort into keeping HBase clusters healthy relative to the value it was delivering over the access patterns Pinterest actually needed most, a dynamic that eventually pushed the company toward re-evaluating whether a wide-column store was really solving the problem better than a well-sharded relational system could.

## A real phase, not a detour

It's worth treating this as a genuine phase of Pinterest's infrastructure history rather than a mistake to wave away — HBase served core traffic for a real stretch of the company's growth, and the operational lessons learned running it directly informed what Pinterest's engineers looked for, and avoided, when they later invested in scaling sharded MySQL instead. Understanding why the wide-column model was chosen, and specifically where its promised benefits didn't fully materialize against Pinterest's real workload, is what made the later architectural decision an informed one rather than a guess.

## Operational gotchas of the HBase years

Pinterest's HBase era was a bet that wide rows and cheap writes would outrun MySQL for graph-shaped and activity-shaped data. The operational tax was ZooKeeper, region servers, and compaction storms that look like "HBase is slow" when the real story is too many tiny files or a hotspot region for a celebrity pin. Mid-size teams still wander here when a vendor pitch says Hadoop ecosystem. Steal wide-column thinking — denormalize the query into a row — without inheriting a 2013 ops stack if a managed Bigtable or even Postgres JSON plus indexes will do.

The concrete failure mode is a row that grows without bound: a user timeline as a single row, then a power user blows the block cache and timeouts cascade. Cap, paginate, or salt. Another gotcha is schema-on-read that never got a schema: every writer invents column families, and a migration cannot find the data. Region splits during peak traffic move hot keys at the worst time. Major compaction I/O steals from serving if you did not throttle. HBase also taught Pinterest what not to keep: some datasets later moved back toward sharded MySQL because operational simplicity beat theoretical scale. Measure on-call hours per terabyte, not only QPS. If your team cannot explain WAL replication and region assignment, you are borrowing a database you cannot land.

## What you can borrow

- A data model that looks like a clean fit on paper (wide, sparse rows for board-and-pin data) still needs validation against your actual read and write patterns in production, not just the schema shape.
- Factor real operational cost — the specialized expertise needed to keep a system healthy — into an infrastructure decision alongside its theoretical scalability.
- Treat an architecture that didn't pan out as a source of concrete lessons for the next decision, not simply a phase to erase from the narrative.
- Horizontal scalability that removes manual sharding work is valuable, but only if it doesn't reintroduce equivalent complexity somewhere else in the stack.
