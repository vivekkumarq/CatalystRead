---
title: "CTEs and Recursive Queries: Solving Hierarchies in SQL"
slug: "ctes-and-recursive-queries"
description: "How common table expressions clean up nested subqueries, and how recursive CTEs turn hierarchical data into a solvable SQL problem."
publishedAt: "2025-05-04"
updatedAt: "2026-09-16"
category: "Databases"
tags:
  - Databases
  - SQL
  - PostgreSQL
  - Query Optimization
  - Data Modeling
---

A query with three levels of nested subqueries is technically correct and practically unreadable — by the time you're three parentheses deep, tracking which alias refers to which intermediate result becomes a real cognitive tax, and every reviewer has to reconstruct the query's logic from the inside out. Common table expressions exist to name each step, so the query reads top to bottom in the order you actually reasoned about it.

## CTEs as readability, not magic

A `WITH` clause doesn't do anything a subquery couldn't do — it names an intermediate result and lets you reference it, once or several times, in the main query. The value is entirely in structure and readability.

```sql
WITH high_value_customers AS (
    SELECT customer_id, sum(total) AS lifetime_value
    FROM orders
    WHERE status = 'completed'
    GROUP BY customer_id
    HAVING sum(total) > 5000
),
recent_orders AS (
    SELECT customer_id, order_id, total
    FROM orders
    WHERE created_at > now() - interval '30 days'
)
SELECT h.customer_id, h.lifetime_value, count(r.order_id) AS recent_order_count
FROM high_value_customers h
LEFT JOIN recent_orders r ON r.customer_id = h.customer_id
GROUP BY h.customer_id, h.lifetime_value;
```

One caveat worth knowing per engine: older Postgres versions (before 12) treated every CTE as an optimization fence, materializing it fully before the outer query could push predicates into it. Postgres 12+ will inline a CTE when it's safe to, same as a subquery, unless you force materialization explicitly with `MATERIALIZED` — useful when you deliberately want the CTE computed once rather than potentially re-evaluated per reference.

## Where CTEs stop being just readability: recursion

`WITH RECURSIVE` is the actual feature that subqueries can't replace at all — it lets a query reference its own output, which is exactly what's needed for tree and graph traversal: org charts, category trees, bill-of-materials explosions, or a comment thread's reply structure.

```sql
WITH RECURSIVE org_chart AS (
    -- Anchor: the top of the hierarchy
    SELECT id, name, manager_id, 1 AS depth
    FROM employees
    WHERE manager_id IS NULL

    UNION ALL

    -- Recursive step: join back to the CTE's own growing result
    SELECT e.id, e.name, e.manager_id, oc.depth + 1
    FROM employees e
    JOIN org_chart oc ON e.manager_id = oc.id
)
SELECT id, name, depth
FROM org_chart
ORDER BY depth, name;
```

The anchor query runs once to seed the result. The recursive term then runs repeatedly, each time joining against only the rows produced in the *previous* iteration, accumulating into the final result, until an iteration produces zero new rows. This is genuinely a fixed-point computation happening inside SQL, not a loop simulated by the application layer issuing one query per level of depth.

## Guarding against infinite recursion

Real hierarchical data occasionally has cycles — a data entry error where an employee is accidentally set as their own manager's manager — and an unguarded recursive CTE on cyclic data will run forever (or until it hits Postgres's default statement timeout). Track the path explicitly and check for revisits:

```sql
WITH RECURSIVE org_chart AS (
    SELECT id, name, manager_id, ARRAY[id] AS path
    FROM employees
    WHERE manager_id IS NULL

    UNION ALL

    SELECT e.id, e.name, e.manager_id, oc.path || e.id
    FROM employees e
    JOIN org_chart oc ON e.manager_id = oc.id
    WHERE NOT e.id = ANY(oc.path)  -- stop if we've seen this node already
)
SELECT * FROM org_chart;
```

## When to reach for it versus an adjacency-list library call

For shallow, occasional hierarchy queries, a recursive CTE run directly against the database is simpler and more consistent than fetching flat rows and reconstructing the tree in application code. For very deep or very frequently traversed hierarchies where performance matters more than simplicity, a materialized path or nested-set model (storing the ancestry directly on each row) trades write complexity for read speed — worth it only once profiling shows the recursive query is actually the bottleneck, not by default.

## A worked failure mode

A recursive CTE walks an org chart with no cycle guard. A bad row points a manager at themselves; the query runs until timeout and takes a worker. Another CTE is referenced twice and executed twice in a planner that does not materialize, scanning a large table twice and surprising the author who thought it was a temp table. The failure is recursion without bounds and CTE-as-cache folklore. Use `CYCLE` / path arrays, cap depth, `EXPLAIN`, and `MATERIALIZED` when you mean it.

## When this is the wrong tool

Recursive SQL is the wrong tool for graphs with frequent writes and deep, hot traversals; a graph store or a closure table maintained in the app may be better. A CTE is the wrong tool if a temp table with indexes would be clearer. Do not recurse in the request path on unbounded user-defined trees without a limit. Use CTEs for readability and bounded hierarchy walks you can explain.
