---
title: "MVCC: How Postgres Handles Concurrency Without Locking Everything"
slug: "mvcc-how-postgres-handles-concurrency"
description: "How Postgres lets readers and writers proceed without blocking each other, what a snapshot actually is, and where MVCC's costs show up later."
publishedAt: "2024-10-29"
category: "Databases"
tags:
  - Databases
  - PostgreSQL
  - Concurrency
  - MVCC
  - Transactions
---

Ask why a `SELECT` in Postgres never blocks behind an `UPDATE`, and the honest answer is that it isn't reading the same row the updater is writing at all. Multi-Version Concurrency Control (MVCC) is the mechanism that makes that possible, and it's worth understanding not as trivia but because its trade-offs — mainly bloat and the need for vacuuming — are things you'll debug directly in production.

## Rows aren't updated in place

When you `UPDATE` a row in Postgres, it doesn't overwrite the existing row version. It writes a brand new row version with the new values, marks the old version as expired (by setting its `xmax` to the current transaction ID), and leaves the old version physically in place on disk. A `DELETE` similarly just sets `xmax` and doesn't reclaim space immediately. Every row carries two hidden system columns, `xmin` and `xmax`, that record the transaction IDs that created and expired that particular version.

```sql
-- These are real, queryable columns on every table
SELECT xmin, xmax, id, status FROM orders WHERE id = 501;
```

When any transaction runs a query, it isn't looking at "the current data" — it's looking at a snapshot: a specific set of transaction IDs that were already committed at the moment the snapshot was taken. For each row version it considers, it checks whether the `xmin` that created it is visible to the snapshot and whether the `xmax` that expired it (if any) is not. That's the entire trick: many versions of the same logical row can coexist on disk, and each transaction simply sees the version consistent with its own snapshot.

## Why this makes readers and writers non-blocking

Because a reader never needs to wait for a writer's expired row version to be cleaned up, and a writer never needs to wait for a reader to finish looking at the old version, `SELECT` and `UPDATE` can proceed concurrently on the same logical row without either one blocking the other. This is the headline benefit of MVCC over lock-based concurrency control, where a reader taking a shared lock would block a writer wanting an exclusive lock. Writers still block writers — two concurrent `UPDATE`s on the same row will serialize — but the far more common read/write mix gets to run in parallel.

```sql
-- Session A: long-running read, sees a consistent snapshot
BEGIN;
SELECT * FROM orders WHERE status = 'pending';

-- Session B: can update the same rows without waiting on Session A
UPDATE orders SET status = 'shipped' WHERE id = 501;
```

## The bill comes due later

Old row versions don't vanish on their own — something has to physically remove them once no active snapshot can possibly need them anymore, and that job belongs to `VACUUM`. If autovacuum falls behind a high-write workload, dead row versions ("bloat") accumulate, tables and indexes grow larger than their live data would justify, and sequential scans get slower because they're wading through dead rows to find live ones. This is also the mechanism behind Postgres's infamous transaction ID wraparound problem: transaction IDs are a finite 32-bit counter, and if vacuum can't freeze old row versions fast enough, the whole system eventually forces itself into a conservative, single-user maintenance mode to protect data integrity.

## Practical takeaways

MVCC means you generally don't need to reach for explicit read locks to get consistent reporting queries against a live system — a plain snapshot already gives you that. But it also means long-running transactions are more dangerous than they look: an old open transaction holds back the point up to which vacuum can safely clean up dead versions, so a forgotten `BEGIN` left open in a psql session can quietly cause bloat across the entire database, not just the tables it touched.
