---
title: "Connection Pooling: Sizing It Right and Avoiding the Pitfalls"
slug: "connection-pooling-sizing-and-pitfalls"
description: "Why connection pool sizing is a math problem, not a guess, and the deadlocks, leaks, and saturation bugs that show up when it's sized wrong."
publishedAt: "2024-11-14"
category: "Databases"
tags:
  - Databases
  - PostgreSQL
  - Performance
  - Connection Pooling
  - Backend
---

The instinct when a database looks slow under load is to raise `max_connections` and the pool size until the errors stop. That usually makes things worse, because a database connection is an expensive OS process (in Postgres, literally a forked process with its own memory), and more of them competing for the same finite CPU and disk I/O means more context switching and worse throughput, not more capacity.

## The pool size isn't about concurrent users

A common mistake is sizing the pool to the number of expected concurrent users or requests. The pool should be sized to the number of connections that can be *actively doing useful work* at once, which is bounded by CPU cores and I/O concurrency, not by how many people are using the app. PostgreSQL's own documentation, and the widely cited formula from the PgBouncer and HikariCP communities, converges on something like:

```
connections = ((core_count * 2) + effective_spindle_count)
```

For a modern server with fast SSD-backed storage, that often lands surprisingly small — 10 to 20 connections total handling thousands of requests per second, because each query holds the connection for milliseconds, not because the app only has a handful of users. A pool of 200 connections against an 8-core database server doesn't give you more throughput; it gives you 200 processes fighting over 8 cores, with the loser queuing behind context switches and lock contention that a smaller, well-tuned pool would never hit.

```sql
-- Check what's actually happening before resizing anything:
-- how many connections are open, and how many are truly active
SELECT state, count(*)
FROM pg_stat_activity
WHERE datname = current_database()
GROUP BY state;
```

A pool that looks "full" but shows most connections `idle` rather than `active` isn't a capacity problem at all — it's connections being held open and unused, which points back at application-level pooling logic, not at `max_connections`.

## The pitfall that actually causes outages: pool exhaustion deadlock

The most common production incident isn't undersizing — it's an application acquiring a connection from the pool, then trying to acquire a *second* connection from the same pool before releasing the first, inside logic that runs under load. If every thread in the app is holding one connection and waiting for a second, and the pool has no spare connections left, every request hangs until something times out. This is a deadlock at the application layer, not the database's fault, and it's most common with ORMs that lazily open a connection per nested query or per thread inside a request without threading the same connection through.

```python
# This pattern exhausts the pool under concurrency:
# thread A holds conn 1, waits for conn 2
# thread B holds conn 1 (its own), waits for conn 2
# if pool_size < 2x concurrent requests using this pattern, everyone hangs
with pool.connection() as conn1:
    result = conn1.execute(query_a)
    with pool.connection() as conn2:   # nested acquisition, same pool
        conn2.execute(query_b, result)
```

The fix is almost always structural: pass the already-acquired connection down instead of acquiring a new one, or use a single connection per unit-of-work (request, job, transaction) and never nest acquisitions from the same pool.

## PgBouncer and the transaction-pooling trade-off

For workloads with many short-lived connections — serverless functions, or a fleet of app instances each keeping their own pool — a proxy like PgBouncer in transaction-pooling mode multiplexes many client connections onto far fewer real database connections, since it only holds a backend connection for the duration of a single transaction. The catch is that session-level features stop working across statement boundaries: prepared statements, session-level `SET` variables, and advisory locks that assume a stable connection can all break silently in transaction mode, because your next statement might land on a different backend connection entirely.

## Sizing in practice

Start from the formula above as a ceiling, not a target, and load test to find where throughput actually plateaus — it's usually well below what intuition suggests. Then set the application pool's timeout aggressively short (a few seconds, not the default of 30) so that pool exhaustion fails fast and visibly instead of degrading into a slow-motion outage where every request queues silently until the whole service falls over.
