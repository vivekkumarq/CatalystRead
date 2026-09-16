---
title: "Raw SQL vs ORM: Where to Draw the Line"
slug: "raw-sql-vs-orm-drawing-the-line"
description: "A practical framework for deciding when an ORM query is fine and when it's time to drop down to raw SQL, with real examples of each."
publishedAt: "2025-03-31"
updatedAt: "2026-09-16"
category: "Databases"
tags:
  - Databases
  - SQL
  - ORM
  - Backend
  - Software Engineering
---

The ORM-versus-raw-SQL debate usually gets argued as a philosophy, when it's really a per-query decision that depends on what the query needs to do. Most CRUD operations are genuinely well served by an ORM. Some queries fight the ORM's abstraction hard enough that raw SQL is not just faster to write, it produces a plan the database can actually optimize well — and knowing which is which up front saves a rewrite later.

## Where the ORM is clearly the right call

Simple CRUD — fetch a record by ID, insert a row, update a handful of fields, delete with a straightforward condition — is exactly what an ORM is good at, and writing it as raw SQL buys nothing but more code to maintain and more surface area for SQL injection if parameterization is done by hand instead of automatically.

```python
# This is the right level of abstraction — no reason to hand-write SQL
order = Order.objects.create(customer_id=42, total=99.50, status='pending')
order.status = 'shipped'
order.save()
```

The ORM also earns its keep on anything involving object identity and relationships in application logic — building up a domain object, validating it, and persisting it as a unit — because that's genuinely a different job than "run this query," and hand-writing SQL for it just re-implements what the ORM already does correctly.

## Where the ORM starts fighting you

The tell that a query belongs in raw SQL is when you're chaining ORM methods to coax out a query shape the query builder wasn't designed to produce — deeply nested aggregations, window functions, `CASE` expressions inside a `SELECT`, recursive CTEs, or multi-table joins with conditional aggregation. At that point you're often writing more code, in a less familiar dialect (the ORM's query DSL), to produce SQL you could write directly and immediately verify with `EXPLAIN`.

```sql
-- Window function + conditional aggregation:
-- painful or impossible to express cleanly through a typical query builder
SELECT
    customer_id,
    date_trunc('month', created_at) AS month,
    sum(total) AS monthly_total,
    sum(sum(total)) OVER (
        PARTITION BY customer_id ORDER BY date_trunc('month', created_at)
    ) AS running_total
FROM orders
WHERE status = 'completed'
GROUP BY customer_id, date_trunc('month', created_at);
```

Reporting and analytics queries are the most common home for raw SQL in an otherwise ORM-heavy codebase, precisely because they tend to need exactly this kind of SQL feature that maps poorly onto an object-relational abstraction built around fetching and persisting rows.

## The middle ground most teams miss

Most ORMs let you drop to raw SQL for one query while staying inside the framework — Django's `.raw()` or `connection.cursor()`, ActiveRecord's `find_by_sql`, Prisma's `$queryRaw`, SQLAlchemy's `text()`. This is usually a better default than a hard binary choice, because it means the bulk of the codebase stays in the ORM's normal, well-tested query path, and only the handful of queries that genuinely need it drop into SQL, with the escape hatch used sparingly and locally rather than becoming the whole architecture.

```python
# Prisma: staying in the framework's transaction and typing while using raw SQL
result = await prisma.query_raw(
    '''SELECT customer_id, sum(total) as lifetime_value
       FROM orders WHERE status = $1
       GROUP BY customer_id
       HAVING sum(total) > $2''',
    'completed', 1000
)
```

## A rule that actually scales

Default to the ORM for anything shaped like fetch-mutate-persist a single entity or a simple filtered list, because readability and safety win there and performance is rarely the bottleneck. Reach for raw SQL the moment a query needs a feature the ORM's builder doesn't model well, or the moment you catch yourself checking `EXPLAIN` on ORM-generated SQL more than once for the same query — at that point, writing it directly is both less code and more honest about what's actually being asked of the database.

## A worked failure mode

A reporting endpoint is built with ORM loops because "we do not write SQL." It times out. Someone pastes a 200-line query into the codebase with no name, no EXPLAIN, and string-concatenated filters. SQL injection returns. The line is: ORM for CRUD with clear relations; SQL for set-based reads you can EXPLAIN, in a repository function with bound parameters and a test. The failure is ideology either way.

## When this is the wrong tool

Raw SQL is the wrong default for inserting a user row. An ORM is the wrong tool for a recursive graph walk you already wrote well in SQL. Do not generate dynamic SQL from user columns without a whitelist. Draw the line per query shape, not per team's identity.

A worked anti-pattern: the team ships the architecture, then staffs it like a toy. "Raw SQL vs ORM: Where to Draw the Line" needs boring operations—backups, timeouts, ownership, and a budget for the tax the idea always charges (compaction, replay, dual writes, extra latency, extra types). Unstaffed taxes come due at 2am. Put the tax in the design doc's cost section. If leadership wants the benefit without the tax, the honest answer is a smaller idea, not a heroic on-call rotation.
