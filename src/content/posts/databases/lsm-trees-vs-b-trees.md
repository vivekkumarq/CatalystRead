---
title: "LSM Trees versus B-Trees: Why Your Database Writes the Way It Does"
slug: "lsm-trees-vs-b-trees"
description: "How B-trees update pages in place and LSM trees turn writes into sorted flushes, with the read/write/space trade-offs that show up in MySQL, Postgres, RocksDB, and Cassandra."
publishedAt: "2026-08-28"
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
