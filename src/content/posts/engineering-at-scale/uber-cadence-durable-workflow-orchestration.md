---
title: "Cadence: Writing Workflow Code as If Failures Never Happen"
slug: "uber-cadence-durable-workflow-orchestration"
description: "How Uber's Cadence engine lets developers write long-running workflow logic as plain code while the platform handles retries and state durably."
publishedAt: "2026-03-24"
category: "Uber"
tags:
  - Engineering at Scale
  - Uber
  - Workflow Orchestration
  - Distributed Systems
sources:
  - title: "Cadence – Uber Engineering's Workflow Orchestration Solution"
    publisher: "Uber Engineering Blog"
    url: "https://www.uber.com/blog/engineering/"
---

Long-running business processes are miserable to code correctly by hand. A trip lifecycle, a driver onboarding flow, a multi-step background check — each involves calling several services, waiting on external responses that might take seconds or days, handling partial failures at any step, and resuming correctly even if the machine running the process crashes and restarts somewhere in the middle. The naive approach — a state machine hand-coded with a database table tracking "current step," plus retry logic sprinkled through every step — works, but it's tedious, error-prone, and every team ends up reinventing a slightly different, slightly buggy version of the same pattern. Uber built Cadence to give developers a better abstraction: write the workflow as ordinary-looking code, and let the platform guarantee it executes durably regardless of failures.

## Fault-oblivious code, on purpose

Cadence's central promise is that workflow code can be written as if failures don't happen — normal sequential logic, normal function calls, normal loops and conditionals — and the underlying engine handles the hard part: persisting the workflow's execution state as it progresses, so that if the worker process executing that workflow crashes, another worker can pick up exactly where it left off without replaying already-completed side effects. Individual steps within a workflow, called activities, are where actual external calls and side effects happen, and Cadence separately manages retries, timeouts, and failure handling for those activities according to policies the developer configures, rather than each developer hand-writing retry loops around every external call.

This "fault-oblivious stateful code" model is what distinguishes a workflow orchestration engine from a plain task queue: a task queue runs discrete jobs, while Cadence tracks the entire multi-step, potentially long-running (hours, days, even longer) execution history of a workflow as a durable, replayable log, so the workflow's state survives worker crashes, deployments, and infrastructure failures without the developer having to design for those cases explicitly in their business logic.

## Real Uber use cases, not a theoretical demo

Cadence wasn't built as a generic showcase — it grew out of concrete needs inside Uber, orchestrating processes like a trip's full lifecycle from request through completion and payment, driver background checks and onboarding steps that span external verification services with unpredictable response times, and other multi-step business processes that needed to be both correct and observable. Having a shared engine for these processes meant Uber didn't need each team to separately solve durability, retries, and state tracking for their own long-running process, the same consolidation motivation behind platforms like Michelangelo.

## Open source, and a fork that became its own company

Uber open sourced Cadence, and it saw adoption at other companies facing similar durable-workflow problems. Notably, several of the original engineers behind Cadence later left Uber and founded Temporal, building a system that shares Cadence's core architecture and philosophy but developed independently as its own open source project and company. That split meant the durable-workflow-orchestration idea Cadence pioneered ended up with two actively maintained lineages in the open source ecosystem rather than one, both tracing back to the same original design.

## What you can borrow

- If multiple teams are hand-rolling similar state-machine-plus-retry-logic for long-running processes, that's a strong signal for a shared workflow orchestration layer.
- Separate "workflow logic" (the sequence of steps) from "activity execution" (side effects and external calls) — it makes retry and failure policy far easier to reason about.
- Durable execution state, not just durable data, is what actually lets a long-running process survive a crash mid-flight.
- Open sourcing infrastructure can outlive the team that built it — plan your architecture to be understandable and maintainable by people who weren't in the original room.
