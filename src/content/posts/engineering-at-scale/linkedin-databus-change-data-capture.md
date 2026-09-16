---
title: "Databus: Change Data Capture Before CDC Was a Category"
slug: "linkedin-databus-change-data-capture"
description: "How LinkedIn built Databus to stream low-latency, ordered change events out of Oracle and MySQL years before change data capture became a common pattern."
publishedAt: "2025-09-10"
updatedAt: "2026-09-16"
category: "LinkedIn"
tags:
  - Engineering at Scale
  - LinkedIn
  - Change Data Capture
  - Distributed Systems
sources:
  - title: "LinkedIn Engineering Blog"
    publisher: "LinkedIn"
    url: "https://engineering.linkedin.com"
---

Long before "change data capture" was a term people reached for by default, LinkedIn had a very concrete version of the problem: its primary databases — Oracle and later MySQL — held the source of truth for things like member profiles, but dozens of downstream systems needed to know the instant that data changed. Search indexes needed reindexing, caches needed invalidating, and derived stores needed to stay in sync, all without hammering the primary database with polling queries or requiring application code to explicitly dual-write to every downstream consumer. The naive approaches all had the same flaw: they either put unacceptable load on the primary, introduced unbounded lag, or required every producer to remember to notify every consumer, which never survived contact with an organization adding new consumers constantly. LinkedIn built Databus to solve change capture once, as its own piece of infrastructure, rather than leaving each team to bolt on its own fragile notification mechanism.

## Capturing changes without burdening the source

Databus worked by tapping into the low-level transaction logs that Oracle and MySQL already maintained for their own durability and replication purposes, rather than adding query load to the primary database or requiring application-level write-through logic. A relay tier read these change events, transformed them into a common, source-agnostic format, and served them to consumers as an ordered, replayable stream keyed by transaction commit order. This meant the source database's normal operation was essentially undisturbed by however many downstream systems were subscribed.

## Bounded lookback and bootstrap

A defining piece of Databus's design was separating two very different consumer needs. A consumer that was already caught up just needed the live, low-latency stream of new changes — Databus relays held a rolling, bounded window of recent events in memory for this. But a brand-new consumer, or one that had fallen far behind, needed to catch up from scratch, which would have been prohibitively expensive to serve out of the same in-memory window. Databus addressed this with a separate bootstrap service that could serve a consistent snapshot of the full dataset as of a given point, after which the consumer seamlessly switched to consuming the live relay stream from that point forward. This bootstrap-then-stream pattern meant new consumers didn't need special-cased handling or a separate one-off data export process every time a new downstream system wanted in.

```
Oracle/MySQL txn log --> relay (bounded in-memory window, ordered by commit)
                                    |
                     caught-up consumers <--- live stream
                                    |
                new/lagging consumers <--- bootstrap snapshot --> switch to live stream
```

## An idea that predated an industry category

Databus's core pattern — read a database's internal change log rather than polling or relying on application-level notification, and give every downstream consumer an ordered, replayable stream — is recognizable today as change data capture, now a well-established category with tools like Debezium built around the same idea. LinkedIn was solving this problem, at production scale, years before the term was in common use, largely because the volume of derived systems consuming member data made anything less than a proper CDC pipeline unworkable.

## A concrete failure mode for change streams

Change data capture looks clean until a primary failover, a long-running transaction, or a schema change lands in the same hour. Databus-era systems had to preserve commit order so search and caches did not apply an update before the insert it depended on. Mid-size teams who bolt a logical decoder onto Postgres or MySQL often skip that ordering contract and then debug "impossible" application states for weeks.

The classic failure is a replica that falls behind during a bulk backfill, then catches up by bursting mutations that overwhelm downstream consumers. The source database looks healthy; the search cluster falls over; operators throttle the wrong layer. Another gotcha is treating the binlog as a public API: application teams start encoding business events only as row changes, then cannot reconstruct why a row changed, only that it did. CDC is a great fan-out mechanism and a poor event model. Steal LinkedIn's split: use the database log for faithful replication of state, and emit explicit domain events when product semantics matter. Watch transaction boundaries — a multi-row checkout that streams as independent row events will briefly look like a paid cart with no line items. If you cannot name the isolation story for those windows, do not put the stream on the member-facing path yet.

## What you can borrow

- Tap the database's own transaction log rather than polling or requiring dual writes — it keeps the source system's load essentially unaffected by however many consumers exist downstream.
- Separate the "catch up from scratch" problem from the "stay current" problem; a bounded, in-memory live stream and a full-snapshot bootstrap service solve very different needs and don't have to be the same code path.
- Give every consumer independent, ordered replay rather than best-effort delivery — it lets new downstream systems be added without special-casing each one.
- If you're building change capture from scratch today, look hard at existing CDC tooling before reinventing what LinkedIn had to build from first principles.
