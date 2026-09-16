---
title: "Architecture Decision Records: Lightweight Decision Memory"
slug: "architecture-decision-records-lightweight-decision-memory"
description: "Why undocumented architectural decisions get relitigated endlessly, and how a lightweight ADR practice preserves the reasoning without becoming bureaucratic."
publishedAt: "2026-03-02"
updatedAt: "2026-09-16"
category: "Software Engineering"
tags:
  - Software Engineering
  - Architecture
  - Documentation
  - Engineering Culture
---

Every codebase accumulates decisions whose reasoning eventually outlives the memory of everyone who was in the room when they were made. Six months later, a new engineer looks at an odd architectural choice, can't find any explanation for it, and has to choose between assuming it was deliberate and correct, or reopening a debate that already happened once, with none of the original context available to settle it either way. Architecture decision records exist specifically to prevent that situation.

## What an ADR actually captures

An ADR isn't a design document — it's much smaller and narrower. It records one decision, the context that made it necessary, the options that were considered, and the reasoning for the choice that was made, written at the moment the decision is made rather than reconstructed later.

```markdown
# ADR-014: Use PostgreSQL row-level security for tenant isolation

## Status
Accepted

## Context
Multi-tenant data currently relies on application-layer WHERE
clauses to filter by tenant_id. A missing filter in any query
path is a full cross-tenant data leak with no defense in depth.

## Decision
Enforce tenant isolation at the database layer using PostgreSQL
row-level security policies, in addition to existing application
filters.

## Consequences
- Cross-tenant leaks require both an app bug and an RLS
  misconfiguration, not just one mistake.
- Adds a policy layer that must be kept in sync with schema
  changes; requires new migration review checklist item.
- Slight query planning overhead, measured at ~3% in load testing.
```

The status field matters more than it looks — a decision that was later superseded should stay in the record with a link to what replaced it, rather than being deleted. The historical record of "we tried this, here's why we moved away from it" is often more valuable than the current decision itself, because it prevents the exact same alternative from being re-proposed and re-debated by someone who wasn't there for the first round.

## Why the consequences section is the part people skip and shouldn't

It's easy to write the decision and the immediate reasoning and stop there, but the consequences section — what this decision costs, what it constrains later, what new discipline it requires — is what makes an ADR actually useful for someone evaluating whether the context that justified it still holds. A decision made under a specific set of constraints two years ago may no longer make sense once those constraints change, and a well-written consequences section is what lets a future reader recognize that quickly instead of having to reverse-engineer the original trade-off from scratch.

## Keeping the practice lightweight enough to survive

ADRs fail when they become a heavyweight process gate — a required sign-off from a committee before any decision can be made turns a lightweight memory tool into a bottleneck, and teams route around bottlenecks by making decisions without recording them at all. The practice works best as documentation of decisions already being made, written by whoever is making the call, reviewed the same way a code change is reviewed, not as a prerequisite that has to clear before the decision can happen.

Not every decision warrants a record. A useful filter is whether the decision would be expensive to reverse, affects multiple teams, or is likely to be questioned later by someone who wasn't part of the original conversation. Routine implementation choices don't need one; a change to how services communicate, how data is partitioned, or which consistency guarantees an API provides usually does.

## Where they live matters

Store ADRs in the same repository as the code they concern, versioned alongside it, rather than in a separate wiki that drifts out of sync and eventually stops getting updated. A numbered, chronological log in a `docs/adr/` directory, searchable and linkable from code comments and pull requests, keeps the decision history exactly where the people who need it — during a code review, during an incident, during a redesign — are already looking.

## A worked failure mode

ADRs are written after the fact as novels; the rejected options are missing; a later team repeats the debate. Another team ADRs every variable name. The failure is weight. One page: context, decision, consequences. Store next to code. Skip reversible choices.

## When this is the wrong tool

ADRs are the wrong tool for a one-line revertible tweak. They will not replace talking to the people who were in the room if you never record names. Do not ADR to dodge a meeting. Use them when the next team will ask why.

Copy-paste from an internal success is still a failure mode. The last team had different traffic, a different datastore, and six months of scars. "Architecture Decision Records: Lightweight Decision Memory" should be adopted with the scars attached: the dashboard they wished they had, the migration they feared, the incident that made the rule. If those artifacts are missing, you are adopting a slide. Spend a day interviewing the last on-call before you spend a quarter implementing their diagram.
