---
title: "RocksDB: The Embedded Storage Engine That Ended Up Everywhere"
slug: "meta-rocksdb-embedded-lsm-engine"
description: "How Facebook forked Google's LevelDB into RocksDB to target fast flash storage, and how an embedded engine built for one problem became infrastructure for many."
publishedAt: "2026-01-20"
category: "Meta"
tags:
  - Engineering at Scale
  - Meta
  - Databases
  - Storage
sources:
  - title: "Under the Hood: Building and open-sourcing RocksDB"
    author: "Dhruba Borthakur"
    publisher: "Facebook Engineering"
    url: "https://engineering.fb.com"
---

In 2012, Facebook was looking for a fast, embeddable key-value storage engine to sit underneath several internal systems that needed local, single-machine storage as a building block — not a full standalone database with its own network protocol and query language, but a library that application code could link against directly. Google's LevelDB was the closest existing fit: a simple, well-regarded embedded key-value store using a log-structured merge-tree (LSM-tree) design. But LevelDB had been designed for a different hardware reality than the one Facebook was increasingly running on — one where spinning disks, with their expensive random-access seeks, were the default assumption baked into a lot of storage engine design at the time.

## Starting from LevelDB, tuning for flash

Facebook forked LevelDB and rebuilt significant parts of it to specifically target machines with fast, low-latency SSD and flash storage, and to take advantage of many-core, multi-threaded server hardware, which LevelDB's original design hadn't been built around. Where a spinning disk makes random reads expensive and sequential reads and writes comparatively cheap, flash storage changes that calculus — random reads are far less punishing, and there's real throughput to gain from parallelizing compaction and reads across many CPU cores rather than treating storage access as effectively single-threaded. RocksDB layered in configurable, multi-threaded compaction, more tunable caching, and a broader set of knobs for trading write amplification against read and space amplification — letting each application embedding RocksDB choose a point on that trade-off curve suited to its own workload, rather than accepting one fixed default.

## An embedded library, not a service

The distinction that matters most about RocksDB is that it's a library, not a standalone server: it runs inside the process of whatever application embeds it, with no separate network hop or protocol to talk to it, which makes it a building block other systems can build on top of rather than a database end users query directly. That's exactly the role it went on to play inside Facebook itself — MyRocks used RocksDB as MySQL's storage engine to replace InnoDB, and other internal systems adopted it as their local storage layer wherever they needed durable, ordered key-value storage on a single machine.

## Becoming ambient infrastructure well beyond Facebook

Facebook open sourced RocksDB in 2013, and it went on to be adopted as the embedded storage layer inside a striking number of other widely used systems outside Facebook — including, at various points, storage layers for stream-processing systems, other distributed databases, and blockchain clients — largely because "an efficient, tunable, embeddable LSM-tree store" turned out to be a need shared by a huge range of systems that had nothing else in common. RocksDB's success wasn't in being the flashiest new database; it was in being general and well-engineered enough at the storage-engine layer that a lot of very different systems found it cheaper to embed than to build their own equivalent from scratch.

## What you can borrow

- When an existing open-source component is close to what you need but tuned for a different hardware assumption (disk vs. flash, single-core vs. many-core), forking and retuning it can be far cheaper than a from-scratch rebuild.
- An embedded library with no network hop is a fundamentally different kind of building block than a standalone service — consider whether your use case actually needs the latter's operational overhead before defaulting to it.
- Exposing tunable trade-offs (write vs. read vs. space amplification) rather than hardcoding one default lets very different workloads share the same underlying engine.
- The most widely reused infrastructure is often not the most visible system, but the well-engineered, general-purpose layer several other systems quietly build on top of.
