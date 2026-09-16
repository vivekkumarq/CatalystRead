---
title: "Spring Data JDBC: When JPA's Persistence Context Is the Bug"
slug: "spring-data-jdbc-when-jpa-is-too-much"
description: "Aggregate-oriented persistence without lazy-loading surprises, how to map one-to-many without Hibernate, and when you should stay on JPA anyway."
publishedAt: "2026-09-13"
updatedAt: "2026-09-16"
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

## How a save actually writes

Spring Data JDBC treats the aggregate root as the unit of persistence. On `save`, unidentified children are inserted; identified children may be updated; missing children are deleted, depending on mapping and whether you loaded the full aggregate. That last sentence is the operational gotcha: a partial load plus `save` can look like “update the header” and actually wipe lines you never fetched.

Load the whole aggregate, mutate in memory, save. If the aggregate is too large for that (an order with ten thousand events), it is not one aggregate — split the model or use a dedicated append table with `JdbcTemplate`.

```java
@Transactional
public void addLine(Long orderId, String sku, int qty) {
  Order order = orders.findById(orderId).orElseThrow();
  order.lines().add(new OrderLine(sku, qty));
  orders.save(order);
}
```

There is no dirty-checking of a single field. Changing `customerId` still writes the aggregate with the library’s strategy. For hot columns on huge rows, that cost is why people stay on JPA or drop to SQL.

## Failure modes

**Lazy habits.** There is no lazy `OneToMany`. If you model `Customer` with a `Set<Order>` you will load every order to change an email. Keep references as IDs (`customerId`) across aggregates.

**Same tables, two ORMs.** A JPA persistence context and a JDBC `save` in one request will disagree about what is in the database. Pick one writer.

**Missing `@Version`.** Lost updates come back. JDBC does not invent optimistic locking because you used to have Hibernate.

**Generated IDs and equals.** If `OrderLine` identity is only a database id, unsaved lines in a `Set` collapse. Prefer value equality on business keys for new lines, or use `List` and document duplicates.

## When not to switch

You already have a large Hibernate graph, custom `EntityGraph`s, and Envers. Rewriting that for “no session” is a year, not a refactor. Stay on JPA, turn on statistics, kill N+1. Data JDBC is for new services or a bounded context you can redraw as aggregates.

Reporting queries that join five tables never belonged in either repository. They belong in SQL.

## Review checklist

- Aggregate boundaries are documented; cross-aggregate links are IDs.
- No `save` after a partial select of children.
- `@Version` on roots that concurrent users edit.
- One write stack per table.

## A worked failure mode

Spring Data JDBC is used with a graph of aggregates that JPA would have loaded; N queries appear and there is no persistence context to hide them. A 1:N is modeled as a root that is too large and every save rewrites children. The failure is pretending JDBC is JPA-lite. Model aggregates small, write joins yourself, enjoy the explicitness.

## When this is the wrong tool

JDBC is the wrong tool if you need lazy graphs and dirty checking and you accept that complexity. JPA is the wrong tool if you are fighting the session all day. Choose JDBC when SQL and aggregates are simple and explicit.

Copy-paste from an internal success is still a failure mode. The last team had different traffic, a different datastore, and six months of scars. "Spring Data JDBC: When JPA's Persistence Context Is the Bug" should be adopted with the scars attached: the dashboard they wished they had, the migration they feared, the incident that made the rule. If those artifacts are missing, you are adopting a slide. Spend a day interviewing the last on-call before you spend a quarter implementing their diagram.
