---
title: "Conductor: Making Microservice Workflows Visible Instead of Implicit"
slug: "netflix-conductor-orchestrating-microservice-workflows"
description: "Why Netflix built Conductor, a workflow orchestration engine, to replace scattered state machines buried inside individual microservices."
publishedAt: "2025-12-28"
category: "Netflix"
tags:
  - Engineering at Scale
  - Netflix
  - Microservices
  - Workflow Orchestration
sources:
  - title: "Netflix Technology Blog"
    publisher: "Netflix"
    url: "https://netflixtechblog.com"
  - title: "Conductor"
    publisher: "Netflix Open Source"
    url: "https://netflix.github.io"
---

Processes like onboarding a new piece of content, transcoding and packaging a video asset, or running a complex studio production workflow don't happen in one service call — they're multi-step sequences that span many microservices, take anywhere from seconds to days to complete, and need to survive individual step failures without losing track of where they are. Before Conductor, that kind of orchestration logic tended to live inside whichever service happened to kick off the process, implemented as ad hoc state machines, retry loops, and status flags scattered across the codebase. Netflix's content and studio engineering teams, dealing with exactly this kind of long-running, many-step process, built Conductor to pull that logic out into a dedicated, visible orchestration layer.

## Workflows as data, not buried code

Conductor's central idea is defining workflows declaratively — as JSON documents describing a sequence (or a directed graph) of tasks, their dependencies, retry policies, and timeout behavior — rather than as imperative code embedded inside a triggering service. A workflow definition says explicitly: run task A, then run B and C in parallel, then run D once both finish, retry D up to three times on failure, and time out the whole workflow after a set duration. That declarative structure means the orchestration logic is inspectable and versionable on its own, separate from the business logic of the individual tasks it coordinates.

```json
{
  "name": "encode_and_publish",
  "tasks": [
    { "name": "validate_source", "type": "SIMPLE" },
    { "name": "transcode", "type": "SIMPLE" },
    { "name": "publish_to_cdn", "type": "SIMPLE" }
  ]
}
```

Individual tasks in a Conductor workflow are executed by workers — ordinary services that poll Conductor for work matching a task type, execute it, and report the result back. Conductor itself doesn't run the task logic; it tracks state, decides what runs next, handles retries and timeouts, and exposes the current status of every in-flight workflow instance. That separation kept task implementation fully owned by the teams that understood the domain, while giving Netflix a central, queryable view of every long-running process across the company.

## Visibility as the actual payoff

The practical win wasn't just correctness — hand-rolled state machines can be made correct too, with enough effort — it was visibility. Before Conductor, answering "where is this specific piece of content in its processing pipeline right now" often meant grepping logs or querying service-specific databases with undocumented schemas. With workflows centralized in Conductor, that question became a straightforward status lookup, and stuck or failed workflows became something operators could see and often retry or restart directly, rather than something that required an engineer familiar with that specific service's internal state machine to diagnose.

That observability mattered enormously for the kind of processes Conductor was built for — content and studio workflows that can span days and involve human review steps — where "is this stuck, and where" is a question that comes up constantly and used to require specialized tribal knowledge to answer.

## What you can borrow

- Pull multi-step orchestration logic out of individual services into a dedicated, visible layer rather than letting it accumulate as ad hoc state machines.
- Define workflows declaratively so they're inspectable, versionable, and reviewable independent of the task implementations they coordinate.
- Separate "what runs next" (orchestration) from "how a task executes" (worker implementation) so teams retain ownership of their own task logic.
- Prioritize operational visibility for long-running processes — being able to answer "where is this stuck" quickly is worth real engineering investment.
- Build in retry, timeout, and failure-handling as workflow-level configuration, not something each task has to reimplement independently.
