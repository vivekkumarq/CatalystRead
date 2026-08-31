---
title: "Database Performance Triage Checklist"
slug: "database-performance-triage-checklist"
description: "When a database is suddenly slow, the order you check things in matters — a triage sequence that finds the real cause before you start guessing."
publishedAt: "2025-05-24"
category: "Performance"
tags:
  - Performance
  - Database
  - SQL
  - Troubleshooting
---

Database performance incidents have a specific shape that's different from most other production problems: the fix, once you find the cause, is usually small — an index, a query rewrite, a connection pool setting — but the diagnosis can eat hours if you approach it by guessing instead of by process. A triage sequence that checks the highest-probability, lowest-effort causes first saves those hours.

## First, rule out that it's actually the database

Before touching the database at all, confirm the slowness is actually there and not somewhere upstream. Application-level connection pool exhaustion produces symptoms that look exactly like a slow database — requests queuing, timeouts — while the database itself sits nearly idle, because every query that does get through runs fine; the wait is entirely for a free connection.

```sql
-- Postgres: are queries actually running slow, or just queued?
SELECT pid, now() - query_start AS duration, state, query
FROM pg_stat_activity
WHERE state != 'idle'
ORDER BY duration DESC;
```

If `pg_stat_activity` (or your database's equivalent) shows mostly idle connections and low actual query duration while your application reports timeouts, the problem is very likely pool size or a leaked connection, not the database engine itself.

## Second, find what's actually running slow

Once you've confirmed real queries are taking real time, identify which ones. Most databases expose this directly rather than requiring you to guess from application logs.

```sql
-- Postgres, with pg_stat_statements enabled
SELECT query, calls, mean_exec_time, total_exec_time
FROM pg_stat_statements
ORDER BY total_exec_time DESC
LIMIT 20;
```

Sort by total time, not mean time, first — a query that runs in 5ms but fires ten thousand times a minute is often a bigger contributor to overall load than a query that takes 500ms but runs once an hour. The 5ms-times-ten-thousand query is also frequently the easier fix, since it's often an N+1 pattern rather than a fundamentally hard query.

## Third, check for the usual structural causes

With a specific slow query identified, run it through `EXPLAIN ANALYZE` and look for the patterns that account for most real-world slow queries: a sequential scan on a large table where an index should be doing the filtering, a join order the planner chose poorly because table statistics are stale, or a query that's technically indexed but on the wrong combination of columns for how it actually filters and sorts.

Stale statistics are worth checking specifically because they're invisible in the query itself — the query and its indexes can be identical to yesterday, when it ran fine, and slow today purely because the planner's row estimates drifted after a large data change. Running `ANALYZE` (or your database's equivalent) is a cheap first thing to try before rewriting anything.

## Fourth, look one level below the query

If individual queries look reasonable in isolation but the database is still under load, check for lock contention — a long-running transaction holding a lock that queues up everything behind it — and check resource saturation directly: CPU, disk I/O, and cache hit ratio. A low buffer cache hit ratio means the database is going to disk for data that should be served from memory, which shows up as uniformly slower queries across the board rather than one obviously bad one, and often points to either insufficient memory allocation or a working set that's grown past what was provisioned.

## Keep the sequence, not just the checklist

The value of this order is that each step is cheaper to check than the next and rules out a distinct, common cause. Jumping straight to "let's add an index" skips the possibility that the database was never the bottleneck, or that the real problem is a lock held by an unrelated transaction that no amount of indexing would fix. Triage in order, and most incidents resolve at step two or three rather than requiring a deep dive into query planning.
