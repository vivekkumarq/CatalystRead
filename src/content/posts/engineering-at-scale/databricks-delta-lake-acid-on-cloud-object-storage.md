---
title: "Transactions on S3: Delta Lake's Log of Atomic Table Versions"
slug: "databricks-delta-lake-acid-on-cloud-object-storage"
description: "Delta Lake put an ordered transaction log in front of Parquet files so Spark jobs could get ACID tables on cheap object stores that do not speak databases."
publishedAt: "2026-10-06"
updatedAt: "2026-10-06"
category: "Databricks"
tags:
  - Engineering at Scale
  - Databricks
  - Data Lakes
  - Databases
sources:
  - title: "Delta Lake: High-Performance ACID Table Storage over Cloud Object Stores"
    author: "Armbrust et al."
    publisher: "VLDB 2020"
    url: "https://www.vldb.org/pvldb/vol13/p3411-armbrust.pdf"
  - title: "Diving into Delta Lake: Unpacking the Transaction Log"
    publisher: "Databricks Blog"
    url: "https://www.databricks.com/blog/2019/08/21/diving-into-delta-lake-unpacking-the-transaction-log.html"
---

Cloud object stores are durable and cheap and they are not databases. They lack multi-object atomic rename in a portable way, they list slowly, and readers can see a mix of old and new files if a writer dies mid-job. Data lakes built as "directories of Parquet" therefore suffered partial writes, lost updates, and the infamous need to repair tables after a crashed Spark job. Databricks' Delta Lake (open sourced, VLDB 2020 paper) added a transaction log: a linearly numbered sequence of JSON (and later checkpoint Parquet) files that record which data files are part of table version *n*. A commit is the atomic add of the next log file. Readers pick a version and see a consistent snapshot. Writers conflict if they try to produce the same next version.

## The log is the table; Parquet is the payload

A Delta table's `_delta_log` directory is small compared to data. Each commit lists add and remove actions for data files, plus metadata (schema, partition columns, protocol version). Optimistic concurrency: read the latest version, write new Parquet, attempt to commit `n+1`. If someone else committed first, retry — possibly after detecting that the files you read are no longer the whole truth. This is the same idea as Git's refs, applied to analytics files. Object storage's PUT-if-not-exists (or equivalent) becomes the compare-and-swap.

Time travel is a free-ish consequence: old versions remain until vacuum removes unreferenced files. That is a retention and compliance feature and a cost footgun if you rewrite the same partitions forever without vacuum. Schema evolution and generated columns live in the log's metadata so readers do not infer schema by opening a thousand files (the old Hive-style tax).

## Streaming, compaction, and the small-file problem

ACID on a lake does not remove the physics of objects. Streaming ingest that commits every second creates swarms of tiny files; query planners die and S3 rate limits follow. Delta's later features — auto-optimize, optimize/Z-order, compaction — exist because the transaction log made it *safe* to rewrite files without readers seeing a torn table. Without ACID, compaction was a weekend of holding jobs.

Concurrent writers still need discipline. Blind append-only streams scale. Two MERGE jobs targeting the same partition set will collide and retry, which can livelock if both keep rewriting the same keys. Isolation is snapshot isolation, not serializable for arbitrary predicates in all protocol versions; engineers who treat Delta like Postgres row-level locking will be surprised. Deletion vectors and liquid clustering in later protocol versions are performance evolutions of the same log-centric design.

The Databricks product bet was that the lakehouse could absorb warehouse workloads if the table format were transactional. Iceberg and Hudi tell a similar story with different logs and catalogs. The borrowable core is portable: an ordered commit file as the atomic unit, data files as immutable payloads, and vacuum as garbage collection. Object storage stays dumb on purpose.

## What you can borrow

- Put an atomic, monotonically numbered log in front of immutable data files; do not rely on directory listing as truth.
- Use optimistic commits with retry; detect real conflicts instead of blindly overwriting partitions.
- Compact small files on a schedule now that rewrites are snapshot-safe.
- Set vacuum and retention explicitly; time travel is storage until you delete unreferenced objects.
- Do not assume MERGE is cheap or serializable like a row store. Design keys and partition layout for your write pattern.
