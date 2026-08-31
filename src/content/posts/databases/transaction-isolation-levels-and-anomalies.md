---
title: "Transaction Isolation Levels and the Anomalies They Allow"
slug: "transaction-isolation-levels-and-anomalies"
description: "A tour of READ UNCOMMITTED through SERIALIZABLE, the dirty reads and phantom rows each level permits, and how to pick one without guessing."
publishedAt: "2024-10-10"
category: "Databases"
tags:
  - Databases
  - SQL
  - Transactions
  - Concurrency
  - PostgreSQL
---

The SQL standard defines four isolation levels, and most engineers can recite their names without being able to say what actually breaks at each one. That gap matters because the default isolation level in your database — READ COMMITTED for Postgres and SQL Server, REPEATABLE READ for MySQL's InnoDB — is a real trade-off someone made on your behalf, and leaving it at the default without understanding what it permits means you're accepting anomalies you may not know exist.

## The three classic anomalies

**Dirty reads** happen when a transaction reads data written by another transaction that hasn't committed yet. If that other transaction rolls back, you've made a decision based on data that never actually existed. Only READ UNCOMMITTED allows this, and in practice almost nobody runs at that level — Postgres doesn't even implement it distinctly, silently upgrading it to READ COMMITTED.

**Non-repeatable reads** happen when you read a row twice in the same transaction and get different values because another transaction committed a change in between. READ COMMITTED allows this; REPEATABLE READ prevents it by giving your transaction a consistent snapshot for its duration.

**Phantom reads** happen when a range query returns different *rows* on a second execution — not just different values in existing rows, but new rows that satisfy the predicate. REPEATABLE READ prevents non-repeatable reads but, per the standard, still permits phantoms. Postgres's actual implementation of REPEATABLE READ is stricter than the standard requires and blocks phantoms too, which is a good example of why you should verify behavior against your specific engine's docs rather than the SQL standard alone.

```sql
-- Session A
BEGIN ISOLATION LEVEL REPEATABLE READ;
SELECT count(*) FROM tickets WHERE status = 'open';  -- returns 5

-- Session B, committed before Session A's next read
INSERT INTO tickets (status) VALUES ('open');

-- Session A, same transaction
SELECT count(*) FROM tickets WHERE status = 'open';  -- still returns 5 in Postgres
```

## SERIALIZABLE and what it actually costs

SERIALIZABLE guarantees that the outcome of concurrent transactions is equivalent to running them one at a time in some order. It's the only level that prevents write skew — the anomaly where two transactions each read a value, each make a decision based on it, and both write, producing a result neither would have produced if it had known about the other. A classic example is two doctors both checking that at least one of them is on call before both going off duty simultaneously, because each check was individually valid against the state each transaction saw.

Postgres implements SERIALIZABLE using SSI (Serializable Snapshot Isolation) rather than locking everything, which means it detects conflicts and aborts one of the transactions with a serialization failure rather than blocking. That has a direct implication for application code: at SERIALIZABLE, you must be prepared to catch a serialization error and retry the transaction. If your code doesn't have retry logic, running at SERIALIZABLE will just produce user-facing errors under load instead of the anomalies you were trying to avoid.

```sql
BEGIN ISOLATION LEVEL SERIALIZABLE;
-- ... application logic ...
COMMIT;
-- On error: SQLSTATE 40001, serialization_failure — retry the whole transaction
```

## Picking a level deliberately

For most CRUD workloads, READ COMMITTED is genuinely fine because individual statements are short and the anomalies it permits rarely matter at that grain. The cases that need something stronger are usually narrow: financial balance checks, inventory decrements, anything with a read-modify-write pattern where two concurrent instances of the same logic could both pass their check and both act. For those, either use SERIALIZABLE with retry logic, or sidestep isolation levels entirely with an explicit `SELECT ... FOR UPDATE` to lock the specific rows you're about to modify — often simpler to reason about than transaction-wide isolation guarantees.
