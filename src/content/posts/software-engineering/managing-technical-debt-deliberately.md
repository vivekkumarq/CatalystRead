---
title: "Managing Technical Debt Deliberately"
slug: "managing-technical-debt-deliberately"
description: "Technical debt taken on deliberately with a repayment plan gets paid back; debt that accumulates silently almost never does."
publishedAt: "2025-11-25"
updatedAt: "2026-09-16"
category: "Software Engineering"
tags:
  - Software Engineering
  - Engineering Practices
  - Software Architecture
  - Team Culture
---

"Technical debt" gets used for two different things that need opposite responses: debt taken on knowingly to hit a deadline, with a plan to repay it, and debt that accumulated because nobody was watching. Treating both the same way — as an ever-growing backlog item nobody prioritizes — is why most technical debt never gets paid down; it's also why teams that do manage it well track the two separately from the start.

## Debt Has an Interest Rate

The metaphor is more useful if you take the finance analogy seriously instead of just borrowing the word. Some debt is low-interest: a slightly awkward module boundary that's mildly annoying to work in but isn't actively slowing anything down. Some is high-interest: a shared utility function with no tests that three teams now depend on, where every change to it risks breaking something invisible until it ships. The high-interest debt is the kind that compounds — it makes *future* work slower, not just this one piece of code uglier — and it's the kind worth prioritizing even when nothing is currently on fire.

```text
Low interest:  awkward but stable — pay down opportunistically
High interest: actively slowing every change nearby — schedule deliberately
```

## Make It Visible, Not Just Known

Debt that lives only in engineers' heads competes for prioritization against features that have tickets, stakeholders, and deadlines — and loses, every time, because it's invisible to whoever is setting priorities. The fix is mechanical: debt gets a ticket like anything else, with a concrete description of the cost it's currently imposing ("this migration script has no rollback, last incident took 6 hours to recover from because of it") rather than a vague "clean this up" — a cost statement is arguable and prioritizable in a way "this is messy" never is.

## Budget for It Instead of Fighting for It

Teams that keep debt under control tend to share one mechanism: a standing allocation, not a one-off negotiation every sprint. Common versions:

- A fixed percentage of each sprint (10-20% is a common range) reserved for debt work, defended the same way an SLA is defended.
- A "boy scout rule" norm — every PR touching a file leaves it slightly better than it found it — for the low-interest debt that doesn't deserve its own ticket.
- A recurring dedicated week or sprint, for debt too large to fit inside the boy-scout model but not urgent enough to interrupt a roadmap.

Whichever mechanism, the point is the same: debt paydown stops being a negotiation that happens from scratch every planning cycle, which is the negotiation debt reliably loses against a shipping deadline with a name attached to it.

## Say No to the Debt You Can't Afford

The other half of "deliberate" is refusing debt at the point it's taken on, not just repaying it later — a genuine conversation at the time a shortcut is proposed: what does skipping this cost us, when do we plan to pay it back, and who owns making sure that happens. Debt taken on with an explicit repayment plan and an owner gets repaid at meaningfully higher rates than debt that accumulates silently, because it was never a *decision* — a decision can be tracked; an accident can't.

The teams that manage debt well aren't the ones with less of it. They're the ones who can tell you, for any piece of debt in the system, why it's there, what it costs, and when it's scheduled to go away.

## A worked example

A debt register: item, trigger (why now), cost of delay, proposed slice. You pay debt when it blocks a feature, not as a 3-month rewrite. Characterization tests before a risky cleanup. Budget: 15% of a sprint named, with a demo of risk reduced.

You delete a dead feature flag instead of "refactoring" around it.

## Failure modes

Endless rewrites. Tracking 400 items nobody reads. Calling every inconvenience debt. Never scheduling the payment. Confusing product debt (wrong feature) with technical debt. Gold-plating.

Using debt as an excuse to skip tests.

## When this is the wrong tool

If the product is dying, do not pay debt. A greenfield rewrite is usually the wrong payment. Do not create a "debt sprint" with no user-visible risk reduction. Metrics like "TODO count" are the wrong KPI. When the issue is staffing or unclear ownership, a rewrite will not help. Skip architecture astronomy.

## A worked failure mode

A "debt sprint" rewrites a module nobody asked to change while the actual debt is a missing backup. Interest is not measured (incidents, lead time). The failure is debt as vibes. List the interest, time-box, and stop when the metric moves.

A debt program is the wrong tool if the issue is understaffing. Do not rewrite instead of deleting. Pay down debt that burns you; leave scars that do not.

Treat the counterexample as part of the spec. Someone will apply "Managing Technical Debt Deliberately" to a problem that only looks similar at the noun level—same words, different constraints. Require a one-page fit check: scale, consistency, failure domains, and who is on call. If two of those are guesses, run a spike, not a rewrite. The expensive bugs are not the ones in the happy-path tutorial; they are the ones where the tutorial's silent assumptions were load-bearing.

A worked anti-pattern: the team ships the architecture, then staffs it like a toy. "Managing Technical Debt Deliberately" needs boring operations—backups, timeouts, ownership, and a budget for the tax the idea always charges (compaction, replay, dual writes, extra latency, extra types). Unstaffed taxes come due at 2am. Put the tax in the design doc's cost section. If leadership wants the benefit without the tax, the honest answer is a smaller idea, not a heroic on-call rotation.
