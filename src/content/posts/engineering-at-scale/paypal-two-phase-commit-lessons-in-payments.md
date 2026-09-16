---
title: "PayPal and Two-Phase Commit: When Distributed Transactions Were the Wrong Kind of Safety"
slug: "paypal-two-phase-commit-lessons-in-payments"
description: "How PayPal's architecture outgrew two-phase commit across databases, and why eventual consistency with compensating actions became the payments pattern."
publishedAt: "2026-11-26"
updatedAt: "2026-11-26"
category: "PayPal"
tags:
  - Engineering at Scale
  - PayPal
  - Distributed Systems
  - Payments
sources:
  - title: "PayPal Engineering"
    publisher: "PayPal"
    url: "https://medium.com/paypal-tech"
  - title: "Dan Pritchett on eventual consistency"
    publisher: "ACM Queue / PayPal era writing"
    url: "https://queue.acm.org/detail.cfm?id=1394128"
---

Two-phase commit promises a comforting sentence: either every participant commits or none do. PayPal, like other large payment platforms, discovered that 2PC across independently failing databases and network partitions is a different sentence: either every participant commits, or you stall holding locks while a coordinator wonders whether a cohort died. Dan Pritchett's well-known writing from his PayPal era (and the industry that cited it) argued that availability and partition tolerance for a global payments UX pushed them toward eventual consistency, explicit reconciliation, and compensating transactions rather than a single distributed commit over the whole estate.

## Why 2PC feels right for money

Money should not fork. If the wallet decrements and the merchant credit fails, you want an abort. 2PC's prepare/commit protocol is the textbook fix. At PayPal's scale the participants are not two MySQL nodes in a rack. They are wallet services, risk, merchant accounts, and later entirely different datastores. A coordinator that must hear from all of them extends the failure domain to the slowest and the most partitioned. Locks held in prepare are how a regional blip becomes a global queue of stuck transfers.

The operational reality of 2PC is heuristic recovery: after a crash, you may not know if the cohort committed. You log, you inquire, you hope the resource managers agree. Payments already need that inquiry loop for card networks that are not in your 2PC. Putting 2PC in front does not remove the need for recovery; it adds a coordinator that can itself become the incident.

## Sagas, compensations, and the ledger as coordinator

The pattern that replaced "one commit" is "a sequence of local commits with an explicit undo." Debit the wallet with an idempotent hold; credit the merchant; if the credit cannot happen, release or reverse the hold. The ledger's state machine is the coordinator, not XA. Users may see pending. Pending is a feature. It is better than a locked table and a timeout.

This is not an argument that ACID inside one database is optional. PayPal still needed strict local transactions. The lesson is about the boundary of a transaction: keep it inside one resource when you can, and design the cross-resource protocol as a business workflow with retries.

## Failure modes of abandoning 2PC without a workflow

The concrete failure is "eventual consistency" as an excuse for fire-and-forget: debit succeeds, credit message is dropped, nobody compensates, a user has vanished money. Mid-size steal: an orchestration record per transfer, timeouts, and a sweeper. 2PC was at least trying to keep a list of participants.

Operational gotcha: compensations that are not inverses. A partial FX conversion cannot always be undone at the same rate. Define the money you guarantee versus the money you estimate. Another is dual writes from the application without an outbox: the process writes DB A, crashes before DB B, and you have rebuilt the 2PC failure without a prepare log. Use an outbox or a ledger event as the source. If you still run XA for a narrow pair of databases, isolate it; do not let a reporting warehouse join the commit. Timeouts on prepare should fail toward a state you can explain to a customer, not toward a silent unknown. Document the customer-visible states: pending, completed, reversed. Unknown is not a state you should show without a ticket.

## What you can borrow

- Keep ACID local; treat cross-service money movement as a workflow with compensations, not XA by default.
- Persist the transfer's participant list and state; sweep unknowns.
- Prefer holds and pending over locks that span network calls.
- Dual-write without an outbox is 2PC's failure mode with less recovery.
