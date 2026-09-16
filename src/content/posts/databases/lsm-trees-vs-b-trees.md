---
title: "LSM Trees versus B-Trees: Why Your Database Writes the Way It Does"
slug: "lsm-trees-vs-b-trees"
description: "How B-trees update pages in place and LSM trees turn writes into sorted flushes, with the read/write/space trade-offs that show up in MySQL, Postgres, RocksDB, and Cassandra."
publishedAt: "2026-08-28"
updatedAt: "2026-09-16"
category: "Databases"
tags:
  - Databases
  - Storage Engines
  - LSM
  - Performance
sources:
  - title: "The Log-Structured Merge-Tree (LSM-Tree)"
    author: "Patrick O'Neil, Edward Cheng, Dieter Gawlick, Elizabeth O'Neil"
    publisher: "Acta Informatica, 1996"
    url: "https://www.cs.umb.edu/~poneil/lsmtree.pdf"
  - title: "bLSM: A General Purpose Log Structured Merge Tree"
    author: "Russell Sears, Raghu Ramakrishnan"
    publisher: "SIGMOD 2012"
    url: "https://scholar.harvard.edu/files/sears/files/p217-sears.pdf"
---

InnoDB and Postgres heap+B-tree indexes update a page, then worry about WAL, checkpoints, and fragmentation. LevelDB, RocksDB, Cassandra, and several cloud warehouses take a different default: never overwrite a sorted file. Incoming writes land in a memtable, flush to an immutable sorted run, and compact in the background. That idea is the LSM-tree (O'Neil et al., 1996), and it is why some databases feel "write friendly" until compaction debt comes due.

## In-place pages versus append and merge

A B-tree point write is often a page read-modify-write. Random writes hurt spinning disks and, at high rates, even flash (write amplification, lock on the page). An LSM write is an append to a log plus an insert into an in-memory tree. Durability is the WAL; the memtable is a cache of recent keys. When the memtable fills, it becomes an SST (sorted string table) on disk.

Reads in an LSM may check the memtable, then several levels of files, usually with Bloom filters to skip files that cannot contain the key. That is why a poorly compacted LSM makes reads worse as the database "ages" — too many files, too many random touches.

```text
Write path (LSM):  WAL → memtable → flush L0 → compact to L1…Ln
Read path (LSM):   memtable + cache + Bloom + maybe several SSTs
Write path (B-tree): WAL → dirty page → checkpoint / flush
Read path (B-tree):  buffer pool + few page reads if the tree is cached
```

## Compaction is the tax

Size-tiered compaction (Cassandra's old default) can create huge merge storms. Leveled compaction (LevelDB/RocksDB) keeps levels overlapping in a controlled way at the cost of more background write amplification. There is no free lunch: you buy sequential writes with extra IO later. Operators who disable compaction to "save CPU" are borrowing from read latency and disk space.

Deletes are tombstones. They occupy space until compaction drops them. A workload that deletes as much as it inserts without giving compaction room will grow forever. That is not a mysterious leak; it is the data structure.

## Picking an engine on purpose

- Lots of random writes, keys that are not read immediately, and you can spend IO on compaction: LSM.
- Point reads with a working set that fits in RAM, in-place updates, rich page-level features (covering indexes, in-page MVCC as Postgres does): B-tree family.
- Hybrid exists (MyRocks, WiredTiger's LSM option, Umbra-style designs). "We use RocksDB" is not a personality. It is a bet on write shape and operational skill at tuning stalls.

When a p99 graph explodes every 30 minutes, look at flush and compaction threads before you add another cache. The storage engine is often the scheduler you did not know you had.

## A worked example

A write-heavy metrics table: LSM (Cassandra, RocksDB) batches writes to WAL + memtable, flushes SSTables, compacts. A read-modify-write OLTP of rows: B-tree (Postgres) updates pages in place. You measure write amplification vs read amplification: LSM may read many levels; B-tree may random-write the same page.

Tuning compaction when space blows up is the LSM tax.

## Failure modes

Point reads on a deep LSM without blooms. Compaction storms. B-tree index bloat from random updates. Using LSM like a queue without TTL. Comparing engines without a WAL fsync policy.

Assuming LSM is always faster.

## When this is the wrong tool

If your load is a typical CRUD app, Postgres B-trees are the default. LSM is the wrong tool for huge range scans that want clustered row locality like a B-tree heap — know the engine. Do not pick Cassandra because of an LSM blog when you need joins. In-memory data is neither. Hybrid engines exist; do not cargo-cult a 2012 talk.
