---
title: "CQRS Without the Ceremony"
slug: "cqrs-without-the-ceremony"
description: "CQRS doesn't require event sourcing or a second database — a minimal, practical version of the pattern and when to reach for more."
publishedAt: "2025-04-28"
category: "System Design"
tags:
  - System Design
  - Software Architecture
  - Scalability
  - Databases
---

CQRS gets introduced through the most extreme version of itself — separate databases, event sourcing, eventual consistency, message buses — and teams conclude it's not for them. The core idea is smaller than that: separate the model you write through from the model you read through, and let each optimize for its own job.

## The Minimal Version

You don't need two databases to get most of the benefit. The smallest useful CQRS split is two code paths against one schema: commands go through a service layer that enforces invariants and writes narrow, validated changes; queries go through a separate path — even raw, denormalized SQL — that never touches the write model's abstractions.

```java
// Command side: enforces invariants, one write per call
public class PlaceOrderCommandHandler {
    public OrderId handle(PlaceOrderCommand cmd) {
        var order = Order.create(cmd.customerId(), cmd.items());
        orderRepository.save(order);
        return order.id();
    }
}

// Query side: shaped for the screen, bypasses the domain model
public class OrderSummaryQuery {
    public List<OrderSummaryRow> forCustomer(CustomerId id) {
        return jdbcTemplate.query(
            "SELECT o.id, o.status, o.total, c.name FROM orders o " +
            "JOIN customers c ON c.id = o.customer_id WHERE o.customer_id = ?",
            id
        );
    }
}
```

The write side stays rich and rule-enforcing. The read side stops fighting the domain model's aggregate boundaries to answer a dashboard query, because it was never using it.

## Why the Read Model Wants to Be Different

Domain models are shaped around consistency boundaries: an `Order` aggregate enforces that its total matches its line items, that you can't ship before payment clears. Screens rarely want an aggregate — they want a joined, flattened, sometimes pre-aggregated view across several aggregates (this customer's orders, joined with shipping status, joined with loyalty points). Forcing one model to serve both jobs means either the write model grows read-only convenience methods that don't belong to any invariant, or the read side pays N+1 queries walking object graphs meant for consistency, not display.

## When to Add a Second Store

The full-fat version — a separate read database, updated asynchronously via events or CDC — earns its cost only when the read and write workloads genuinely conflict: read traffic is orders of magnitude higher than write traffic, or a read model needs a fundamentally different storage engine (a search index, a graph store, a wide denormalized table) than the transactional writer.

| Signal | Response |
| ------ | -------- |
| Reads and writes just want different shapes | Split code paths, same database |
| Read load is starving write throughput | Read replica or dedicated read store |
| Read model needs a different engine (search, graph, OLAP) | Async projection via events/CDC |

## The Actual Trade-off

The moment you add a second store fed asynchronously, you've bought eventual consistency — a write may not be visible on the read side for milliseconds to seconds, and every screen using that read model has to tolerate it, or you need a way to route "read your own write" traffic back to the source. That's the real cost of CQRS, not the pattern's plumbing. Adopt the split when the read and write sides are visibly fighting each other, not because a talk made distributed event buses sound inevitable.
