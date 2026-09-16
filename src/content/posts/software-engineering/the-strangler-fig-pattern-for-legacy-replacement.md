---
title: "The Strangler Fig Pattern for Legacy Replacement"
slug: "the-strangler-fig-pattern-for-legacy-replacement"
description: "How the strangler fig pattern lets you replace a legacy system incrementally behind a routing layer, avoiding the failure modes of a big-bang rewrite."
publishedAt: "2026-05-11"
updatedAt: "2026-09-16"
category: "Software Engineering"
tags:
  - Software Engineering
  - Architecture
  - Legacy Systems
  - Migration
---

Full rewrites of legacy systems have a well-earned reputation for failure, and the pattern behind most of the failures is depressingly consistent: the team spends a year building a replacement in isolation while the legacy system keeps evolving underneath them, the rewrite's scope keeps growing to match, the cutover date keeps slipping, and eventually the project gets cancelled with nothing shipped, or it ships and breaks in ways nobody anticipated because the old system's real behavior was never fully understood in the first place. The strangler fig pattern, named after the vine that grows around a host tree and gradually replaces it, exists specifically to avoid that failure mode.

## Route, don't rewrite, first

The pattern starts by putting a routing layer — a proxy, an API gateway, or a facade — in front of the legacy system, with every request initially passing through to the old system unchanged. Nothing about the legacy system's behavior changes on day one; the routing layer is pure infrastructure at this point, and its only job is to make it possible to redirect individual pieces of functionality later without anyone downstream noticing the difference.

```
Before:  Client → Legacy System

Step 1:  Client → Router → Legacy System

Step N:  Client → Router → New Service (orders)
                        → New Service (users)
                        → Legacy System (everything else)
```

Once that layer exists, you migrate one capability at a time: pick a well-bounded piece of functionality, build its replacement, and switch the router to send that specific traffic to the new implementation while everything else continues to flow to the legacy system exactly as before.

## Why incremental beats big-bang

Each migrated piece is independently testable, independently deployable, and independently reversible — if the new implementation of one capability has a problem, the router switches back to the legacy path for just that capability, without touching anything else that's already been migrated or anything still pending. This bounds the blast radius of any single migration step to a size a team can actually reason about, verify, and roll back with confidence.

It also produces continuous value instead of a single payoff at the end of a long project. A big-bang rewrite delivers nothing until it delivers everything; a strangler fig migration delivers a working, in-production improvement with each piece that's cut over, which matters enormously for sustaining organizational patience and funding over a migration that might otherwise take a year or more.

## Where teams get this wrong

Choosing the wrong first slice is the most common early mistake. Starting with the most tangled, highest-risk piece of the legacy system, because it's the one causing the most pain, sounds appealing but tends to produce the same drawn-out, high-stakes project the pattern was meant to avoid. Starting with a smaller, well-understood, lower-risk capability first builds confidence in the routing infrastructure and the team's process before the hardest piece gets tackled with lessons already learned.

The router itself needs real investment, not a quick shim thrown together to unblock the first migration. It has to handle partial failures gracefully, support gradual traffic shifting rather than an all-or-nothing switch, and provide enough observability to detect when the new implementation is behaving differently from the old one before that difference reaches every user. Treating the router as throwaway infrastructure undermines the entire premise of being able to migrate safely and incrementally.

## Knowing when it's done

The pattern's name implies an ending: the legacy system, gradually stripped of functionality as pieces are strangled away, eventually has nothing left to do. In practice, teams should set an explicit target for what "done" means and treat any remaining sliver of legacy functionality as a deliberate, documented decision rather than an indefinitely deferred cleanup — otherwise a genuinely well-run incremental migration can stall out in a permanent partial state that carries the maintenance cost of two systems instead of the benefit of either.

## A worked failure mode

A strangler proxy is added and never routes more than 2% of traffic; both systems grow. Dual writes diverge; a customer sees old balances. There is no kill date for the legacy path. The failure is a pattern without a strangulation metric. Route by a clear dimension, compare outputs, and delete the old path.

## When this is the wrong tool

Strangler is the wrong tool for a 2,000-line app you could rewrite in a week. Big-bang is the wrong tool for a core ledger, but strangler is also wrong if you cannot proxy. Use it when you can intercept and incrementally replace.

A worked anti-pattern: the team ships the architecture, then staffs it like a toy. "The Strangler Fig Pattern for Legacy Replacement" needs boring operations—backups, timeouts, ownership, and a budget for the tax the idea always charges (compaction, replay, dual writes, extra latency, extra types). Unstaffed taxes come due at 2am. Put the tax in the design doc's cost section. If leadership wants the benefit without the tax, the honest answer is a smaller idea, not a heroic on-call rotation.
