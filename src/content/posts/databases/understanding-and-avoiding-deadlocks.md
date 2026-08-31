---
title: "Understanding and Avoiding Database Deadlocks"
slug: "understanding-and-avoiding-deadlocks"
description: "Why deadlocks happen even in well-designed schemas, how to read a deadlock log, and the lock-ordering habits that prevent them."
publishedAt: "2025-05-20"
category: "Databases"
tags:
  - Databases
  - Transactions
  - Concurrency
  - SQL
  - Reliability
---

A deadlock isn't a bug in your schema or a sign that something is fundamentally wrong with the application — it's two transactions each holding a lock the other one needs, and it can happen in a perfectly reasonable schema the moment two code paths update the same rows in different orders under enough concurrency. The database detects it, kills one transaction to break the cycle, and the fix is almost always about lock *order*, not about the schema itself.

## The minimal deadlock

The canonical case only needs two transactions and two rows:

```sql
-- Transaction A
BEGIN;
UPDATE accounts SET balance = balance - 100 WHERE id = 1;
-- ... pauses here ...
UPDATE accounts SET balance = balance + 100 WHERE id = 2;
COMMIT;

-- Transaction B, running concurrently
BEGIN;
UPDATE accounts SET balance = balance - 50 WHERE id = 2;
-- ... pauses here ...
UPDATE accounts SET balance = balance + 50 WHERE id = 1;
COMMIT;
```

If A locks row 1 and then waits for row 2, while B has already locked row 2 and is waiting for row 1, neither can proceed — each is waiting on a lock the other holds. Postgres's deadlock detector runs periodically, notices the cycle, and aborts one of the two transactions with a `deadlock_detected` error so the other can complete. This is the database working correctly, not failing — the alternative would be both transactions hanging forever.

## Reading the deadlock log

Postgres logs a full report when it kills a transaction for deadlock, and it's worth reading past the headline error, because it names the exact locks and queries involved:

```
ERROR:  deadlock detected
DETAIL:  Process 1234 waits for ShareLock on transaction 5678;
         blocked by process 5678.
         Process 5678 waits for ShareLock on transaction 1234;
         blocked by process 1234.
Process 1234: UPDATE accounts SET balance = balance + 100 WHERE id = 2;
Process 5678: UPDATE accounts SET balance = balance + 50 WHERE id = 1;
```

That detail block is the fastest path to a fix: it names the two specific statements and rows involved, which tells you exactly which code paths are updating rows in inconsistent order — information you'd otherwise have to reconstruct from application logs and timing guesses.

## The fix: consistent lock ordering

The general prevention strategy is to always acquire locks on multiple rows in the same, fixed order, regardless of which "direction" the business logic is conceptually going. For the transfer example, that means always locking the lower `id` first:

```sql
-- Always touch rows in ascending id order, regardless of transfer direction
UPDATE accounts SET balance = balance - 100 WHERE id = LEAST(1, 2);
UPDATE accounts SET balance = balance + 100 WHERE id = GREATEST(1, 2);
```

Applied consistently across every code path that updates more than one row from this table, two concurrent transactions can no longer form a cycle — they'll simply queue behind each other in the same order, one waiting briefly for the other rather than deadlocking.

## Application-level defenses

Beyond lock ordering, keep transactions short and avoid doing slow, non-database work (an external API call, a slow computation) between statements inside a transaction — the longer a transaction holds its locks, the larger the window for another transaction to collide with it. And because deadlocks can still happen even with disciplined lock ordering under enough concurrency, application code that writes to more than one row per transaction should catch the specific deadlock error code and retry the whole transaction automatically, rather than surfacing it as a user-facing failure. A deadlock that's retried transparently is invisible to the user; one that isn't handled becomes an intermittent, hard-to-reproduce bug report.
