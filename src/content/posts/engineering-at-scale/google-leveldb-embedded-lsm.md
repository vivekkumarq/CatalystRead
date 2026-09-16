---
title: "LevelDB: How a Library Inherited Bigtable's LSM Lessons"
slug: "google-leveldb-embedded-lsm"
description: "Jeff Dean and Sanjay Ghemawat's embedded key-value store: tables, compaction, and why so many databases still speak its file format."
publishedAt: "2026-08-01"
updatedAt: "2026-09-16"
category: "Google"
tags:
  - Engineering at Scale
  - Google
  - Storage
  - LSM
sources:
  - title: "LevelDB"
    author: "Sanjay Ghemawat and Jeff Dean"
    publisher: "Google / GitHub"
    url: "https://github.com/google/leveldb"
  - title: "Bigtable: A Distributed Storage System for Structured Data"
    author: "Fay Chang et al."
    publisher: "OSDI 2006"
    url: "https://research.google/pubs/pub27898/"
---

Bigtable showed that a distributed tablet server could sit on GFS with an LSM-shaped log and SSTables. LevelDB took the local part of that idea and made a library: a process-embedded key-value store with a memtable, a log, immutable tables, and background compaction. Chrome's IndexedDB backend, early Riak bits, Bitcoin's chainstate, and RocksDB (Facebook's fork) all sat on that lineage. You do not need a cluster to inherit Bigtable's write path.

## The local LSM

Writes hit a log and a skiplist memtable. When the memtable fills, it flushes to a table file at level 0. Compaction merges overlapping files downward so reads do not touch a pile of L0 files forever. Snappy compression and a small block size were defaults aimed at latency on spinning disks and early SSDs, not at "maximum compression ratio."

The API is tiny on purpose: `Put`, `Get`, `Delete`, snapshots, iterators. There is no SQL, no replication. Those belong in the application or in a system like RocksDB that added them later.

## Why RocksDB forked it

LevelDB assumed a relatively gentle compaction thread and a single writer mindset that did not match Facebook's multi-threaded, write-heavy MySQL-replacement workloads. RocksDB added more compaction styles, column families, and a lot of stall-tuning knobs. The file format family stayed recognizable. That is a successful library: people fork the runtime without throwing away the on-disk idea.

## When an embedded LSM is the right product choice

- You need ordered iteration and range scans, not only a hash map.
- Write bursts should not stall on B-tree page splits.
- You can operate compaction (disk headroom, thread pools) inside the same process that serves users.

When you cannot, you wanted SQLite (one-file SQL, different trade-offs) or a hosted store. Putting LevelDB on a network share is a way to discover that the library never promised distributed consensus.

Read a slice of the LevelDB `doc/` implementation notes if you are about to tune RocksDB. The vocabulary — levels, tables, version set — is the same conversation Google's storage engineers were already having after Bigtable, just without the cluster.

## Compaction is the operator

Writes are fast until L0 files pile up and compaction cannot keep up. Then reads open too many files and writers stall. LevelDB’s single compaction thread made that stall obvious. RocksDB’s multiple threads and leveled vs universal styles move the stall; they do not delete it. Disk headroom is part of the API: if the volume is 95% full, compaction has nowhere to write the output table.

MANIFEST / CURRENT files record which tables are live. Killing the process is fine; killing the process and deleting “those extra SST files” is how you lose a version. Treat the directory as one database, not a folder of independent files.

## Failure modes

**Shared filesystem.** NFS or a networked block device with weak fencing was never the design. Two processes opening one directory is corruption. One process, local disk.

**Huge values.** LSM loves small keys and modest values. Multi-megabyte values bloat tables and compaction. Put blobs in object storage and store pointers.

**Iterators and snapshots held too long.** They pin old versions; compaction cannot drop files. A long analytical scan inside the same process that serves writes will look like a space leak.

**Checksums off in a fork.** LevelDB verifies block checksums by default for a reason. Turning them off for speed is a data-loss setting.

## When not to embed an LSM

You need SQL, secondary indexes, and a well-understood backup story — SQLite or a hosted Postgres. You need multi-writer across hosts — not LevelDB. You need only a cache with TTL — an in-memory map or memcached. Chrome’s use of LevelDB is “embedded, single writer, local disk,” which is the original product.

If you are choosing RocksDB because “Google used LSM,” read the compaction stats you will have to page on. The library is small; the operational surface is the background merge.

## Review checklist

- Single process, local disk, backup of the whole directory.
- Compaction and stall metrics on the same dashboard as QPS.
- Values sized so tables stay reasonable; blobs live elsewhere.
- Snapshots/iterators have bounded lifetimes.
