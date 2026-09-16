---
title: "Spring Data JDBC: When JPA's Persistence Context Is the Bug"
slug: "spring-data-jdbc-when-jpa-is-too-much"
description: "Aggregate-oriented persistence without lazy-loading surprises, how to map one-to-many without Hibernate, and when you should stay on JPA anyway."
publishedAt: "2026-09-13"
category: "Spring Boot"
tags:
  - Spring Boot
  - JDBC
  - JPA
  - Databases
---

JPA shines when you have a graph of entities, lazy relations, and a persistence context that tracks dirty fields. It also produces N+1 queries, `LazyInitializationException` after the transaction ends, and cascade settings nobody remembers. Spring Data JDBC takes a different model: you load an **aggregate**, you save the aggregate, there is no hidden session. If that sounds like DDD's persistence story, it is on purpose.

## Aggregates, not entity graphs

A `PurchaseOrder` with `OrderLine` rows is one aggregate. You fetch it with a single (or a few explicit) queries, mutate it in memory, and `save` writes the whole thing with a defined strategy (delete-and-insert lines, or identified rows). There is no proxy that silently hits the database when a JSON serializer touches `getLines()`.

```java
record OrderLine(String sku, int qty) {}

@Table("orders")
class Order {
  @Id Long id;
  String customerId;
  Set<OrderLine> lines;
}

interface OrderRepository extends CrudRepository<Order, Long> {}
```

You will write more SQL-shaped mappings for anything tricky. That is the cost of not having Hibernate invent SQL for you.

## What you give up

Second-level cache, dirty checking of 200 fields, Criteria API, and "just add `@ManyToMany`." Complex reporting queries belong in `@Query` methods or jOOQ anyway — they did on JPA too, if you were honest.

Optimistic locking still exists (`@Version`). Transactions still exist. You did not leave the database; you left the ORM session.

## When to pick JDBC vs JPA vs MyBatis

- CRUD on clear aggregates, few relations, team tired of lazy loading: Data JDBC.
- Large existing Hibernate model, lots of implicit graph walking: stay on JPA and fix fetch plans.
- Hand-tuned SQL is the product (analytics-ish): MyBatis or jOOQ.

Mixing JPA and JDBC on the **same tables** in one transaction is how you get cache vs database races. Pick a write path.

If a service's only JPA usage is `findById` plus a 400-line entity with six lazy bags, Data JDBC (or even `JdbcTemplate`) will shrink the runtime surprise surface. That is a maintainability argument, not a religion.
