---
title: "InnoDB Clustered Indexes: Why the Primary Key Is the Table"
slug: "mysql-innodb-cluster-index-design"
description: "How InnoDB stores rows in primary-key order, what secondary indexes actually contain, and how a UUID PK becomes a random I/O tax."
publishedAt: "2026-08-04"
category: "Databases"
tags:
  - Databases
  - MySQL
  - InnoDB
  - Indexing
sources:
  - title: "InnoDB Clustered and Secondary Indexes"
    publisher: "MySQL Reference Manual"
    url: "https://dev.mysql.com/doc/refman/8.4/en/innodb-index-types.html"
  - title: "High Performance MySQL"
    author: "Baron Schwartz, Peter Zaitsev, Vadim Tkachenko"
    publisher: "O'Reilly"
    url: "https://www.oreilly.com/library/view/high-performance-mysql/9781449332471/"
---

InnoDB does not keep a heap plus a primary index the way some Postgres tables do. The **clustered index is the table**. Rows live in B+tree leaf pages ordered by the primary key. Pick a PK that inserts at the right-hand edge (monotonic) and you append. Pick a random UUID v4 and you scatter writes across the tree, fragment pages, and blow the buffer pool.

## Secondary indexes always include the PK

A secondary index in InnoDB stores the indexed columns plus the **primary key columns** as the row locator. There is no separate heap tuple id. That design makes PK lookups from a secondary index a second tree descent unless the query is covering. It also means a wide PK is paid on **every** secondary index: four secondary indexes on a 36-byte UUID PK duplicate that width four times.

```text
PRIMARY KEY (id)  -- clustered leaves = full rows
INDEX (email)     -- leaf: email + id
SELECT name FROM t WHERE email = ?  -- not covering; lookup id in clustered tree
```

Covering indexes matter more here than in heap-and-index engines. `SELECT id FROM t WHERE email = ?` can be satisfied from the secondary index alone. `SELECT *` cannot.

## Hidden 6-byte keys and the NOT NULL habit

If you omit a primary key, InnoDB synthesizes a 6-byte row id. That sounds convenient until you realize replicas, pt-online-schema-change, and humans cannot name the row. Always declare an explicit PK. Prefer `NOT NULL`; nullable unique indexes in MySQL have historically surprising semantics with multiple NULLs.

Monotonic PKs (`BIGINT AUTO_INCREMENT`, ULID, UUID v7) keep inserts hot on one leaf. The downside is a right-hand-side contention hotspot under extreme insert rates — a problem of success, mitigated by partitioning or descending inserts tricks, not by switching to random keys as a first move.

Random PKs spread inserts, which can reduce that hotspot at the cost of page splits everywhere and poorer spatial locality for range scans. If your access is always by secondary unique email, you still pay random clustered lookups for the rest of the row.

## Design checklist

Keep the PK small and stable. Do not use a natural composite of `(org_id, slug, created_at)` as clustered key unless that is truly how you range-scan the table; you will copy those columns into every secondary index. Put covering columns in secondary indexes for the hot `SELECT` list, but do not cover `SELECT *`.

`OPTIMIZE TABLE` rebuilds the clustered index; it is a heavy rewrite, not a vacuum analog you schedule casually. Monitor fragmentation and change buffer for secondary index maintenance on write-heavy tables.

When someone proposes `UUID()` as PK "for distribution," ask whether they meant uniqueness across clients or insert locality. InnoDB makes that tradeoff physical. Postgres's heap can hide a bad PK behind an index; InnoDB will not.

Read the InnoDB index chapter in the reference manual, then `SHOW TABLE STATUS` and `information_schema.innodb_indexes` on a table you regret. The extra bytes on secondary indexes are usually the PK you chose in week one.
