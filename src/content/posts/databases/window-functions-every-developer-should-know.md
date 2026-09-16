---
title: "Window Functions Every Developer Should Know"
slug: "window-functions-every-developer-should-know"
description: "An introduction to window functions — running totals, rankings, and moving averages — for anyone still reaching for self-joins and subqueries."
publishedAt: "2025-04-16"
updatedAt: "2026-09-16"
category: "Databases"
tags:
  - Databases
  - SQL
  - PostgreSQL
  - Analytics
  - Query Optimization
---

There's a specific, recognizable moment in a lot of SQL codebases: a correlated subquery, or a self-join with an inequality condition, computing something like "this row's rank within its group" or "the running total up to this row." It usually works, it's usually slow, and it's usually replaceable with a window function in a fraction of the code and often an order of magnitude less work for the planner, because a window function computes its result in a single pass over data the engine has already grouped and sorted, instead of re-scanning the table once per row.

## The core idea: aggregate without collapsing rows

A regular aggregate with `GROUP BY` collapses many rows into one. A window function computes an aggregate-like value *per row*, using a defined "window" of related rows, without reducing the row count at all. That distinction is the whole feature.

```sql
SELECT
    order_id,
    customer_id,
    total,
    sum(total) OVER (PARTITION BY customer_id) AS customer_lifetime_total
FROM orders;
```

Every row keeps its identity, but now also carries an aggregate computed over its partition (here, all of that customer's orders) — no self-join, no subquery, no `GROUP BY` collapsing the order-level detail you still need in the output.

## Ranking, without the self-join

Ranking rows within a group used to mean a self-join counting how many rows in the same group have a higher value — quadratic in the worst case and painful to read. `ROW_NUMBER`, `RANK`, and `DENSE_RANK` replace that entirely:

```sql
SELECT
    customer_id,
    order_id,
    total,
    RANK() OVER (PARTITION BY customer_id ORDER BY total DESC) AS spend_rank
FROM orders;
```

`RANK` leaves gaps after ties (1, 1, 3), `DENSE_RANK` doesn't (1, 1, 2), and `ROW_NUMBER` breaks ties arbitrarily but guarantees uniqueness — useful for deduplication, which is one of the most common practical uses of a window function in production: keep only the latest row per key.

```sql
-- Deduplicate: keep only the most recent row per email
DELETE FROM signups
WHERE id IN (
    SELECT id FROM (
        SELECT id, ROW_NUMBER() OVER (
            PARTITION BY email ORDER BY created_at DESC
        ) AS rn
        FROM signups
    ) ranked
    WHERE rn > 1
);
```

## Running totals and moving averages: the frame clause

`OVER (PARTITION BY ... ORDER BY ...)` alone gives you a running aggregate up to the current row by default, but the explicit frame clause is what lets you control exactly which rows are included — critical for moving averages.

```sql
SELECT
    day,
    revenue,
    avg(revenue) OVER (
        ORDER BY day
        ROWS BETWEEN 6 PRECEDING AND CURRENT ROW
    ) AS trailing_7day_avg
FROM daily_revenue;
```

`ROWS BETWEEN 6 PRECEDING AND CURRENT ROW` defines a 7-row frame ending at the current row — a rolling 7-day average with no subquery, no join, and no application-side loop. Swap `ROWS` for `RANGE` when you want the frame defined by value proximity rather than row count, which matters when your rows aren't evenly spaced (gaps in daily data, for instance).

### LAG and LEAD: comparing a row to its neighbor

Comparing a row to the previous or next row in an ordered sequence — day-over-day change, time between consecutive events for the same user — is another pattern that used to require a self-join on a computed row number.

```sql
SELECT
    day,
    revenue,
    revenue - LAG(revenue) OVER (ORDER BY day) AS day_over_day_change
FROM daily_revenue;
```

## Why this matters beyond convenience

Beyond being less code, window functions genuinely execute better: the engine sorts and partitions the data once and computes the windowed values in that single pass, whereas the equivalent self-join or correlated subquery typically forces repeated scans or joins proportional to the row count. If you're writing a query with `GROUP BY` just to compute a value you then join back to the ungrouped rows, that's almost always a window function that hasn't been recognized as one yet.

## A worked failure mode

`ROW_NUMBER() OVER (PARTITION BY user ORDER BY ts DESC)` is used to pick latest rows, but the query lacks a filter on `rn = 1` in an outer query, so the UI still shows everything and is just slower. Another window omits `PARTITION BY` and ranks globally, assigning rank 1 to a single user. `EXPLAIN` shows a sort of the whole table every request. The failure is windows as decoration. Filter after ranking, partition on the entity, and materialize a "latest" table if this is the hot path.

## When this is the wrong tool

Window functions are the wrong tool for graph traversal. They can be the wrong tool if a `DISTINCT ON` (Postgres) or a grouped `max` plus join is simpler. Do not window a billion-row table on each page view. Use them for analytic shapes (running totals, latest-n, gaps) you can bound.

When this pattern is stretched past its assumptions, the first outage looks like a mysterious performance cliff instead of a design limit. "Window Functions Every Developer Should Know" fails that way when traffic mix, data shape, or team skill does not match the blog that sold the approach. Keep a kill switch: feature flag, smaller blast radius, or an older path that still works. Measure the thing the idea claims to improve, not a vanity graph. If you cannot name a workload where you would refuse to use it, you have not finished the design.
