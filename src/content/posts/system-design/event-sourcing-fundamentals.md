---
title: "Event Sourcing Fundamentals: Storing Facts Instead of State"
slug: "event-sourcing-fundamentals"
description: "Why storing immutable facts instead of current state changes how you build, replay, and evolve systems, and when it isn't worth the cost."
publishedAt: "2025-04-09"
updatedAt: "2026-09-16"
category: "System Design"
tags:
  - System Design
  - Event-Driven Architecture
  - Software Architecture
  - Databases
---

Most systems store the current state of the world and overwrite it on every update — an `UPDATE orders SET status = 'shipped'` erases whatever the row looked like a moment before. Event sourcing inverts this: the system of record is an append-only sequence of facts, and current state is a derived, replaceable view.

## Storing Events Instead of State

An event is something that happened, named in the past tense and immutable once written: `OrderPlaced`, `PaymentCaptured`, `OrderShipped`. The event store never updates or deletes rows — it only appends.

```sql
CREATE TABLE events (
    stream_id UUID NOT NULL,
    sequence_no INT NOT NULL,
    event_type TEXT NOT NULL,
    payload JSONB NOT NULL,
    occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (stream_id, sequence_no)
);
```

`stream_id` groups events belonging to one aggregate (one order, one account); `sequence_no` enforces ordering and doubles as an optimistic concurrency check — an insert with a sequence number that already exists means someone else wrote first, and the writer retries against the new state.

## Rebuilding State: Projections and Snapshots

Current state is just the fold of all events for a stream:

```python
def rebuild_order(events: list[Event]) -> Order:
    order = Order.empty()
    for event in events:
        order = order.apply(event)
    return order
```

This is honest but doesn't scale to a stream with 50,000 events. Two standard fixes: **snapshots** (periodically persist the folded state so replay starts from the last snapshot instead of event zero), and **projections** — separate, purpose-built read models kept up to date by subscribing to the event stream, each shaped for one query pattern rather than forcing one schema to serve all of them. This pairing is what most people mean when they say "event sourcing plus CQRS" — the events are the write model, projections are the read models.

## Handling Schema Evolution

Events are immutable, but the code that interprets them isn't static — a payload shape from two years ago has to keep deserializing correctly. The two workable strategies:

- **Upcasting**: transform old event versions into the current shape at read time, keeping one canonical in-memory representation.
- **Weak schema, tolerant reader**: consumers read only the fields they need and ignore or default anything unfamiliar, so additive changes never break old readers.

What doesn't work well is versioning by rewriting history — the append-only guarantee is the entire point, so migrations happen by never touching old rows, not by "fixing" them.

## When It's Worth the Cost

Event sourcing earns its keep when you need a true audit trail, when "what happened and in what order" is a business requirement (financial ledgers, inventory, compliance-heavy domains), or when multiple, differently-shaped read models genuinely need to stay in sync with one write path.

It's a poor fit for simple CRUD domains where nobody asks "how did we get here" — you pay real complexity (event versioning, projection lag, eventual consistency between write and read sides) for a history nobody queries. The tell is in the requirements, not the technology: if the business already asks for an audit log or a "replay this account" support tool, event sourcing is answering a question you were going to have to answer anyway.

## A worked example

`AccountOpened`, `MoneyDeposited`, `MoneyWithdrawn` append-only. Current balance is a fold of events, snapshotted every N events. A projection table `account_balance` updates via a subscriber. Audit is the log. You version event schemas (`Deposited.v2`) and upcast.

A test replays a fixed event list and asserts the fold.

## Failure modes

Mutable "events." Huge blobs in events. Projections rebuilt from prod on every boot. No snapshot, 10M events to fold per request. Using ES for CRUD with one `EntityUpdated` event. GDPR delete without a plan. Dual-writing state and events.

Consumers that assume order across aggregate IDs.

## When this is the wrong tool

If you do not need an audit of facts, a current-state table is enough. ES is the wrong tool for a CMS body (use versions). Analytics event streams (product analytics) are not the same as an account ledger ES. When the domain has no invariants worth replaying, skip it. Mixing ES with random SQL updates to the same entities will lie.
