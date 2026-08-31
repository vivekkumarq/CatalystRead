---
title: "How B-Tree Indexes Actually Work"
slug: "how-btree-indexes-actually-work"
description: "A practical walkthrough of B-tree index internals, why they dominate relational databases, and how their structure shapes real query performance."
publishedAt: "2024-09-05"
category: "Databases"
tags:
  - Databases
  - SQL
  - PostgreSQL
  - Performance
  - Indexing
---

Every relational database engineer has typed `CREATE INDEX` a hundred times without ever looking at what actually gets built underneath. That's fine most of the time — until a query that should take milliseconds takes seconds, and the only way to reason about why is to understand the structure the planner is walking through. Almost every general-purpose index you've created, unless you explicitly reached for something else, is a B-tree (technically a B+tree in most implementations), and its shape explains both its strengths and its blind spots.

## The shape of the tree

A B-tree is not a binary tree with extra steps. Each node holds many keys — often hundreds, depending on key size and page size — and many children, not just two. That branching factor is the whole point: it keeps the tree shallow. A table with 10 million rows might only need a tree four or five levels deep, so a lookup means four or five page reads regardless of table size, not the `log2(n)` comparisons you'd expect from a binary tree.

In a B+tree specifically, which is what Postgres, MySQL's InnoDB, and SQL Server all use for standard indexes, only the leaf nodes store the actual row pointers — internal nodes exist purely to route the search. Leaf nodes are also linked together, left to right, which is why range scans are efficient: once you find the start of the range, you walk the linked leaves instead of re-traversing the tree from the root each time.

```sql
-- This benefits enormously from a B-tree index on created_at
-- because it becomes a leaf-to-leaf scan, not repeated root traversals
SELECT id, total
FROM orders
WHERE created_at BETWEEN '2025-01-01' AND '2025-01-31'
ORDER BY created_at;
```

## Why column order in composite indexes matters

A composite index on `(customer_id, created_at)` is a single tree keyed on the concatenation of those columns, sorted first by `customer_id`, then by `created_at` within each `customer_id`. That means the index is genuinely useful for `WHERE customer_id = ?`, for `WHERE customer_id = ? AND created_at > ?`, and for ordering within a customer — but it's nearly useless for `WHERE created_at > ?` alone, because rows for that date range are scattered across every branch of the tree. The prefix rule isn't a database quirk; it's a direct consequence of how the keys are sorted and stored.

```sql
CREATE INDEX idx_orders_customer_date
ON orders (customer_id, created_at);

-- Uses the index efficiently: leading column is present
SELECT * FROM orders WHERE customer_id = 42 AND created_at > '2025-06-01';

-- Cannot use this index for the predicate at all
SELECT * FROM orders WHERE created_at > '2025-06-01';
```

## Where B-trees stop being the right tool

B-trees excel at equality and range queries on ordered scalar data, but they're the wrong structure for other access patterns. Full-text search needs an inverted index (GIN in Postgres). Nearest-neighbor lookups on vectors need something like HNSW or IVF. Array containment queries — "does this array contain X" — also want GIN, because a B-tree can't efficiently index a value that isn't a single scalar sitting in a fixed position. Reaching for a B-tree on these workloads gets you a sequential scan disguised as an index scan, which is worse than no index at all because it hides the real cost.

## Practical implications

Two things follow directly from the structure. First, maintenance cost is real: every insert or update that touches an indexed column can trigger a page split, which is why bulk-loading data is often faster with indexes dropped and rebuilt afterward rather than maintained incrementally. Second, bloat is a leaf-node problem — deleted or updated rows leave gaps that autovacuum (or an equivalent process) has to reclaim, and a heavily updated table with five indexes pays that cost on every one of them, not just the primary key. Treating the index as a tree you're actively maintaining, rather than a magic lookup table, turns both of those behaviors from mysterious slowdowns into predictable, plannable costs.
