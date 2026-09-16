---
title: "Postgres Query Planner Statistics: What ANALYZE Is Actually For"
slug: "postgres-query-planner-statistics"
description: "How pg_statistic, n_distinct, most-common values, and correlation drive join order — and the incidents that start with a stale ANALYZE."
publishedAt: "2026-08-03"
category: "Databases"
tags:
  - Databases
  - PostgreSQL
  - Query Planning
  - Performance
sources:
  - title: "PostgreSQL documentation: Planner Statistics"
    publisher: "PostgreSQL Global Development Group"
    url: "https://www.postgresql.org/docs/current/planner-stats.html"
  - title: "Row Estimation Examples"
    publisher: "PostgreSQL documentation"
    url: "https://www.postgresql.org/docs/current/row-estimation-examples.html"
---

Postgres does not pick an index because you "have an index." It estimates **how many rows** each clause will produce, how expensive each access method is, and which join order explodes last. Those estimates come from **statistics** collected by `ANALYZE` (and autovacuum's analyze). When they are wrong, you get a nested loop over two million rows that looked like 40 in `EXPLAIN`.

## What the planner actually stores

Per column, `pg_statistic` holds a histogram of value ranges, a list of **most-common values** (MCVs) with frequencies, **n_distinct**, null fraction, and **correlation** (how ordered the physical heap is versus the column's logical order). Correlation is why an index scan plus heap fetch is cheap on a clustered-ish table and catastrophic on a randomly inserted one: the planner models random I/O.

For a predicate `status = 'open'`, if `'open'` is in the MCV list, Postgres uses that frequency. If it is not, it interpolates from the histogram. For `LIKE 'foo%'`, it has a different guess. For `jsonb` containment, default stats are often weak unless you create **extended statistics** (`CREATE STATISTICS`) on correlated columns.

```sql
ANALYZE orders;
SELECT attname, n_distinct, correlation
FROM pg_stats WHERE tablename = 'orders';
```

`n_distinct` of `-1` means "unique." A wrong `n_distinct` after a bulk load is a classic join blow-up: Postgres thinks `user_id` has 200 values when it has two million.

## Autovacuum analyze is not a SLA

Autovacuum triggers analyze based on tuple churn fractions. A table that grows by copying a partition, or that receives a one-shot import, can sit with empty stats (`reltuples` near zero) until someone runs `ANALYZE`. The planner then falls back to **defaults** that assume a few pages. `EXPLAIN (ANALYZE, BUFFERS)` is how you catch this: estimated rows 1, actual rows 8,000,000.

Join selectivity for `a.id = b.a_id` uses distinct counts on both sides. Independent-column assumptions fail when `country` and `postal_code` are correlated. Extended statistics with `ndistinct` and `dependencies` exist specifically for that. Teams that add a composite index without extended stats still lose on filter estimates.

## Practical knobs, used sparingly

`default_statistics_target` (default 100) controls histogram and MCV size. Raising it per column (`ALTER TABLE ... ALTER COLUMN ... SET STATISTICS`) helps skewed columns. It makes `ANALYZE` slower and stats larger; it is not a global `SET` to 10000 on a giant OLTP cluster without measuring.

`random_page_cost` versus `seq_page_cost` encodes your storage. On NVMe, if you left `random_page_cost` at 4, the planner over-penalizes index I/O. On a spinning replica used for reporting, 4 may still be honest.

When a plan regresses after a version upgrade or a data shape change, dump `pg_stats` before you rewrite SQL. Many "optimizer bugs" are stale or missing stats. `CREATE STATISTICS` plus a targeted `ANALYZE` is cheaper than a hinting culture Postgres does not really have.

Read the row-estimation docs once. Then make `ANALYZE` after bulk loads a migration step, not a hope. The planner is only as honest as the last sample.
