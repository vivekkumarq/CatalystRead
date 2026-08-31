---
title: "Reading Query Execution Plans Without Guessing"
slug: "reading-query-execution-plans"
description: "A field guide to reading EXPLAIN output, spotting sequential scans that shouldn't be there, and turning a query plan into an actual fix."
publishedAt: "2024-09-24"
category: "Databases"
tags:
  - Databases
  - SQL
  - Performance
  - PostgreSQL
  - Query Optimization
---

Most developers' relationship with `EXPLAIN` goes something like: paste the query, paste the output into a chat, ask someone else what it means. That's a reasonable instinct when the output is genuinely dense, but the plan is answering a specific, learnable question — what did the optimizer decide, and was it right — and you don't need to memorize every node type to get useful signal out of it fast.

## Start at the estimate, not the tree shape

The single most useful habit is running `EXPLAIN (ANALYZE, BUFFERS)` instead of bare `EXPLAIN`. Bare `EXPLAIN` shows you what the planner *thinks* will happen; `ANALYZE` actually runs the query and shows you what *did* happen, row by row, alongside the estimate. The gap between estimated and actual rows is the first thing to check, because a huge gap means the planner's statistics are stale or its assumptions about correlated columns are wrong — and every decision downstream of a bad estimate (join order, join algorithm, whether to use an index at all) is built on that wrong number.

```sql
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT o.id, c.name
FROM orders o
JOIN customers c ON c.id = o.customer_id
WHERE o.status = 'pending'
  AND o.created_at > now() - interval '7 days';
```

Look for lines like `rows=12 (actual rows=48213)`. That kind of gap usually means it's time to `ANALYZE` the table to refresh statistics, or that a predicate involves columns whose values are correlated in a way the planner can't infer — which is what extended statistics (`CREATE STATISTICS`) exist to fix.

## Sequential scan isn't automatically bad

A `Seq Scan` on a small table, or on a query that's going to touch most of the table's rows anyway, is often the *correct* plan — reading a table linearly can beat jumping around an index when you need a large fraction of the rows. The red flag isn't the word "Seq Scan," it's a sequential scan on a large table for a query that should be selective, combined with a `Filter` line showing thousands of rows discarded after the scan. That combination means an index either doesn't exist, doesn't match the predicate's leading column, or the planner has decided (rightly or wrongly, per the estimate check above) that it isn't worth using.

## Reading joins and costs

Nested Loop, Hash Join, and Merge Join each have a sweet spot. Nested Loop is fine — often fastest — when the outer side is small, because it does one index lookup on the inner side per outer row. It becomes a disaster when the planner underestimates the outer row count and picks Nested Loop for what turns out to be a million-row outer set, since that's a million lookups instead of one hash build and one scan. Hash Join is what you want for large, roughly equal-sized sets with an equality condition, since it builds an in-memory hash table on the smaller side once. Merge Join needs both sides pre-sorted, so it shows up when there's already an index providing that order.

The `cost=` numbers on each node are arbitrary units, not milliseconds — useful for comparing alternative plans the optimizer considered, not for judging absolute speed. For absolute speed, `actual time=` is what matters, and it's cumulative including children, so the number that matters for a specific node is its own time minus its children's time.

## Turning a plan into a fix

A plan tells you what happened, not what to change, so translate it into one of a few concrete actions: add or reorder a composite index to match the leading predicate, run `ANALYZE` if estimates are off, rewrite a query so a `WHERE` clause is sargable instead of wrapping the column in a function, or accept that the plan is already close to optimal and the real fix is fetching less data. Treating the plan as a diagnostic tool rather than an oracle is what separates fixing the actual bottleneck from cargo-culting an index that doesn't move the number at all.
