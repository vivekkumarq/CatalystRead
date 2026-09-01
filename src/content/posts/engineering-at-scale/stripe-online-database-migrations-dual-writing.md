---
title: "Stripe's Four-Phase Pattern for Migrating Databases Without Downtime"
slug: "stripe-online-database-migrations-dual-writing"
description: "How Stripe moves data between database schemas and systems while staying live, using a four-phase dual-write and backfill pattern instead of a maintenance window."
publishedAt: "2026-02-09"
category: "Stripe"
tags:
  - Engineering at Scale
  - Stripe
  - Databases
  - Migrations
---

A payments company can't take the database offline for a schema migration — a maintenance window means declined charges and broken checkouts for however long it lasts. Stripe has written about the general pattern its teams use to move data between schemas, tables, or even entirely different database systems while staying fully live and consistent throughout, without ever pausing writes. The pattern isn't exotic on its own; the discipline is in doing every phase in order and verifying each one before moving to the next.

## Phase one and two: write to both, then backfill

The migration starts by making application code dual-write: every write that would go to the old location also gets written to the new one, so from that point forward, no new data is ever missing from the destination. Only once dual-writing is live does the backfill begin — copying historical data that existed before dual-writes started from the old location into the new one. Doing this in the wrong order is the classic mistake: backfilling first and turning on dual-writes afterward leaves a window where data written during the backfill can be missed by both processes, silently dropping records that need to exist in the new system.

## Phase three: verify before you trust it

Before any read traffic moves to the new location, Stripe's pattern calls for verification — comparing data in the old and new locations against each other, either continuously or via a batch process, to catch discrepancies caused by bugs in the dual-write logic, edge cases in the backfill, or race conditions between concurrent writes. This phase is often the longest and least glamorous part of the migration, but it's what turns "we believe the new system is correct" into "we've measured that the new system is correct," which matters enormously when the data in question represents money.

```
1. Dual-write: every write goes to old and new
2. Backfill: copy pre-existing data old -> new
3. Verify: compare old and new for discrepancies
4. Cut over reads, then stop writing to the old system
```

## Phase four: cut over reads, then retire the old writes

Only after verification shows the new location is trustworthy does read traffic move over, typically incrementally — a percentage of reads at a time, or one internal consumer at a time — so a discrepancy that verification missed shows up as a small, contained problem rather than an outage. Writes to the old system are the last thing to stop, kept around as a safety net until confidence in the new system is high enough that maintaining two write paths is no longer worth the cost. Each of the four phases is independently reversible: if a problem turns up, the previous phase's state is still the source of truth and the migration can pause or roll back without needing an emergency fix under pressure.

## What you can borrow

- Order matters: start dual-writes before backfilling, not after, or you create a window where in-flight data is missed by both processes.
- Treat verification as a distinct, first-class phase with its own budget of time and effort — skipping it just moves the risk of undiscovered discrepancies from the migration into production.
- Move reads over incrementally rather than all at once, so a bug surfaces as a small, contained issue rather than a full outage.
- Keep the old write path alive until you're confident in the new system, and only retire it last — it's your rollback plan for the entire migration.
