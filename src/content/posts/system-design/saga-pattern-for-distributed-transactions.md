---
title: "The Saga Pattern for Distributed Transactions"
slug: "saga-pattern-for-distributed-transactions"
description: "Choreography versus orchestration, compensating actions, and the eventual consistency you actually get from the saga pattern."
publishedAt: "2025-05-15"
updatedAt: "2026-09-16"
category: "System Design"
tags:
  - System Design
  - Distributed Systems
  - Microservices
  - Reliability
---

A single database transaction can't span three services without turning them back into one system with extra steps. The saga pattern is the standard answer: break a multi-step business transaction into a sequence of local transactions, each with a defined way to undo itself if a later step fails.

## Choreography vs. Orchestration

In a **choreographed** saga, each service reacts to events from the previous step and emits its own — no central coordinator.

```text
OrderService: OrderCreated
   -> PaymentService listens, charges card, emits PaymentCaptured
      -> InventoryService listens, reserves stock, emits StockReserved
         -> ShippingService listens, schedules shipment
```

This keeps services decoupled but makes the overall flow hard to see — there's no single place that shows "here's what a checkout does," and adding a step means touching the event contracts of whichever services sit next to it in the chain.

In an **orchestrated** saga, a coordinator explicitly calls each step and decides what happens on failure:

```python
class CheckoutSaga:
    def run(self, order):
        try:
            payment.charge(order)
            inventory.reserve(order)
            shipping.schedule(order)
        except InventoryError:
            payment.refund(order)
            raise
        except ShippingError:
            inventory.release(order)
            payment.refund(order)
            raise
```

The flow is explicit and testable, at the cost of a coordinator that now knows about every participant — a small, deliberate coupling in exchange for visibility.

## Compensating Actions Aren't Rollbacks

The hardest part of a saga isn't sequencing — it's that compensation is not a database rollback. Once `PaymentService` has captured a charge, "undoing" it is a refund: a new, visible transaction, not an erasure. Compensations have to be designed as first-class operations with their own failure modes:

- A refund can itself fail (card expired, account closed) — the saga needs a path for compensations that don't cleanly succeed, often a manual review queue rather than an infinite retry.
- Compensations must be idempotent, because the step that triggers them may itself be retried after a timeout.
- Order matters: compensate in reverse of the forward sequence, undoing the most recent, least-committed step first.

## Consistency You Actually Get

A saga gives you eventual consistency, not atomicity. There is a real window — milliseconds to minutes — where payment has succeeded but inventory hasn't been reserved yet, and any code or user reading state during that window sees a partial, in-progress order. Two mitigations, not mutually exclusive: mark orders in an explicit `PENDING` state until the saga completes so readers know not to trust it yet, and keep sagas short — the longer a saga runs, the more places a partial state can leak into a UI or another system.

## When Not to Bother

If the steps genuinely all belong to one service and one database, use a real transaction — a saga is solving a distribution problem you don't have yet, and it adds compensating-action code for failure modes a `ROLLBACK` already handles for free. Reach for sagas only once the steps are owned by services that don't share a database, because that's the actual constraint the pattern exists to work around.

## A worked example

Order: reserve inventory, charge card, create shipment. Each step is a local transaction plus a message. Compensations: release inventory, refund, cancel shipment. Orchestrator state machine stores current step. Choreography: each service emits events; you draw the graph so it cannot loop.

A test: charge fails, inventory reservation is released.

## Failure modes

Compensations that are not themselves idempotent. No timeout on a stuck step. Orchestrator as a god DB. Choreography with hidden cycles. Assuming compensations undo side effects that already emailed the customer. Dual-write without outbox.

Using sagas for a single database.

## When this is the wrong tool

One Postgres transaction is better. Sagas are the wrong tool for a money transfer you can do with a ledger table and a single DB. 2PC/consensus inside a region may be simpler for a small set of stores you own. If compensation is impossible (irreversible physical action), you need a different business process, not a saga library. Do not saga for a CRUD update of one service.
