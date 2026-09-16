---
title: "Hunting Down N+1 Queries in JPA Before They Hunt You"
slug: "jpa-n-plus-one-queries-detection-and-fixes"
description: "Practical techniques for spotting N+1 query problems in Hibernate and JPA before they show up as a production latency incident."
publishedAt: "2025-02-25"
updatedAt: "2026-09-16"
category: "Spring Boot"
tags:
  - Spring Boot
  - JPA
  - Hibernate
  - Performance
---

The N+1 problem never announces itself in code review. It hides behind a perfectly reasonable-looking `for` loop and a lazy-loaded association, and it only becomes visible once someone loads a page with 200 rows instead of the 20 you tested with. Catching it early is mostly a matter of knowing where to look and turning on the right logging.

## What's Actually Happening

You fetch a list of orders — one query — then iterate over them accessing `order.getCustomer().getName()`. Because `customer` is lazily fetched, Hibernate issues a separate `SELECT` for each order the first time its customer is touched. Twenty orders means twenty-one queries instead of one or two, and the ratio gets worse as your dataset grows, which is exactly why it survives local testing and shows up in production.

```java
List<Order> orders = orderRepository.findAll();
for (Order order : orders) {
    System.out.println(order.getCustomer().getName()); // triggers one SELECT per order
}
```

## Making the Problem Visible

The single highest-leverage thing you can do is enable statement logging in non-production environments and actually read the output during development, not just when something's already slow:

```yaml
logging:
  level:
    org.hibernate.SQL: DEBUG
    org.hibernate.orm.jdbc.bind: TRACE
```

Better still, add a hard limit so the problem fails loudly instead of quietly degrading. Hibernate's `hibernate.query.fail_on_pagination_over_collection_fetch` and a statement counter in tests both work, but the most reliable approach is a library like `datasource-proxy` or a simple `HibernateQueryInterceptor` in integration tests that asserts a maximum query count for a given endpoint. Catching a regression from "3 queries" to "23 queries" in CI is far cheaper than catching it in a postmortem.

## Fixing It: Pick the Right Tool

There's no single correct fetch strategy — it depends on the access pattern.

**JOIN FETCH** for a known, bounded association you always need:

```java
@Query("SELECT o FROM Order o JOIN FETCH o.customer WHERE o.status = :status")
List<Order> findByStatusWithCustomer(@Param("status") OrderStatus status);
```

This is ideal for single associations but multiplies rows (and can duplicate parent entities) when applied to a collection, so avoid `JOIN FETCH` on more than one `List`-typed association in the same query.

**`@EntityGraph`** when you want the mapping declared near the repository method rather than buried in JPQL:

```java
@EntityGraph(attributePaths = {"customer", "lineItems"})
List<Order> findByStatus(OrderStatus status);
```

**Batch fetching** when eager loading everything isn't practical but you still want to collapse N queries into a handful:

```yaml
spring:
  jpa:
    properties:
      hibernate:
        default_batch_fetch_size: 25
```

With batch fetching enabled, Hibernate replaces N individual `SELECT ... WHERE id = ?` calls with a handful of `SELECT ... WHERE id IN (?, ?, ..., ?)` calls, which is a low-effort, low-risk win you can apply globally.

## Know Which Fix Fits

`JOIN FETCH` is best when the association is always needed and the collection side is small or absent. Batch fetching is best as a default safety net across the whole application, since it requires no query rewriting. `@EntityGraph` sits in between, giving you per-query control without hand-writing JPQL. In practice, most services benefit from setting a sane default batch size globally and reaching for `JOIN FETCH` or `@EntityGraph` only on the handful of hot-path queries where the access pattern is well understood. Treat N+1 detection the same way you treat null-pointer prevention: a habit enforced by tooling, not a thing you remember to check manually.

## A worked example

`Order` has `OneToMany lines`. `findAll()` then `order.getLines().size()` in a loop: 1 + N queries. Fix: `join fetch` in a dedicated query, or `@EntityGraph`, or a DTO projection that selects what the API needs. `spring.jpa.open-in-view=false` plus a test that fails on extra statements (`datasource-proxy` or p6spy count).

A JSON serializer triggering lazy loads is the usual production surprise.

## Failure modes

`EAGER` on collections as a "fix" (cartesian products). Multiple `join fetch` bags (hibernate multiplebagfetchexception). Entity graphs that fetch the whole graph for a list view. Pagination plus fetch join duplicating rows. Batch size helping N+1 but hiding it.

OSIV hiding the problem until a thread pool.

## When this is the wrong tool

If the access path is reporting, SQL/jOOQ is better than fetch graphs. Caching entities to hide N+1 still hits memory. Do not disable lazy loading globally. For one-off admin pages, N+1 of 20 rows is fine. GraphQL resolvers can reintroduce N+1 — use DataLoader, not JPA magic. If you migrated to JDBC aggregates, this ticket may already be dead.
