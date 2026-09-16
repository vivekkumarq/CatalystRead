---
title: "The N+1 Problem Across ORMs, and How to Actually Fix It"
slug: "n-plus-one-problem-across-orms"
description: "Why the N+1 query problem keeps reappearing across every ORM, how to spot it before production does, and the fixes that actually hold up."
publishedAt: "2025-03-13"
updatedAt: "2026-09-16"
category: "Databases"
tags:
  - Databases
  - ORM
  - Performance
  - SQL
  - Backend
---

Every ORM, from ActiveRecord to Django's ORM to Hibernate to Prisma, produces the same bug in the same shape, because it's not a bug in any specific library — it's the natural consequence of letting object access patterns silently trigger database queries. You loop over a collection, touch a related object on each item, and each touch fires its own round trip. One query becomes N+1 queries, and it's invisible in code review because the code reads like ordinary object access, not like a loop full of database calls.

## What it actually looks like

```python
# Django, but structurally identical in every ORM
orders = Order.objects.filter(status='pending')  # 1 query
for order in orders:
    print(order.customer.name)  # 1 query per order — N additional queries
```

The code is correct and readable, which is exactly the problem — nothing about `order.customer.name` signals "this hits the database." At 10 orders this is invisible in local testing. At 10,000 orders in production, it's 10,001 round trips where one join would have worked, and the latency shows up as a page that mysteriously gets slower as a specific list grows, not as an obvious error. What actually hits the database is the query log made visible:

```sql
-- One query for the list
SELECT id, customer_id, status FROM orders WHERE status = 'pending';

-- Then one of these per row in the result set above
SELECT id, name FROM customers WHERE id = 1;
SELECT id, name FROM customers WHERE id = 2;
-- ...repeated once per order, N times
```

### Why it survives code review

The reason this pattern keeps shipping isn't carelessness, it's that the fix lives in a different layer than the bug. The loop looks fine on its own; the problem is only visible if you already know that `.customer` is a lazy-loaded relation, which requires either reading the ORM's query log or already being burned by this exact pattern once. Query logging in development (`django-debug-toolbar`, Rails' `bullet` gem, Hibernate's `show_sql`, or just turning on your ORM's SQL logging locally) is the single highest-leverage habit here, because it turns an invisible problem into an obvious one — a request log showing 200 nearly-identical queries is unmissable in a way the source code isn't.

## The actual fix: eager loading

Every mainstream ORM has a mechanism to fetch the related data in a fixed number of additional queries — typically one extra query using `WHERE id IN (...)`, or a single join — instead of one per row.

```python
# Django: one extra query total, not one per order
orders = Order.objects.filter(status='pending').select_related('customer')
```

```ruby
# Rails: same idea, .includes issues a batched second query
Order.where(status: 'pending').includes(:customer).each do |order|
  puts order.customer.name
end
```

`select_related` (and Rails' `.includes` in its join form) generates a single SQL join. Some ORMs also offer a batched-fetch mode — a separate `WHERE id IN (...)` query instead of a join — which is preferable when the relation is one-to-many and a join would multiply row counts unnecessarily; know which one your ORM's eager-loading call actually produces, because they have different performance characteristics on large relations.

## When eager loading isn't enough

Eager loading everything by default has its own cost — fetching relations you don't actually render on every request adds real overhead. The pattern that scales is loading relations deliberately per code path: list views load only the fields the list actually shows, detail views eager-load what the detail page needs, and nothing is fetched by default just because the model has a relation defined. This also means N+1 bugs tend to reappear whenever a template or serializer is extended to show one more related field, so the query log check belongs in the review process for any change that touches a loop over a collection, not just as a one-time audit.

## Catching it before production

The durable fix isn't vigilance, it's automation: tools like Rails' `bullet` gem or Django's `select_related`-detection linters raise the alarm in development or CI the moment a lazy load happens inside a loop, which catches the pattern at the point it's introduced instead of after it's degraded a production page for months.

## A worked failure mode

A list page loads 50 orders; each lazily loads customer and 20 lines. 1,000 queries, p99 2s. The ORM dashboard looks "fine" because each query is 2ms. A naive `join fetch` then cartesian-products lines and customers and allocates a 200MB graph. The failure is lazy defaults plus unmeasured pages. Log query count per request, use a batch IN / dataloader, or a dedicated query with aggregation. Fix the page, not a global EAGER that destroys other endpoints.

## When this is the wrong tool

Micro-optimizing the ORM is the wrong tool when the page should not load 50 full graphs. An ORM is the wrong layer for a reporting cube. Do not "solve N+1" by prefetching the entire database. Use explicit queries for list endpoints and keep the ORM for simple CRUD.

A worked anti-pattern: the team ships the architecture, then staffs it like a toy. "The N+1 Problem Across ORMs, and How to Actually Fix It" needs boring operations—backups, timeouts, ownership, and a budget for the tax the idea always charges (compaction, replay, dual writes, extra latency, extra types). Unstaffed taxes come due at 2am. Put the tax in the design doc's cost section. If leadership wants the benefit without the tax, the honest answer is a smaller idea, not a heroic on-call rotation.
