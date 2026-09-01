---
title: "The API Mandate: How One Internal Memo Forced Amazon Into Services"
slug: "amazon-api-mandate-service-oriented-architecture"
description: "How an internal Bezos mandate requiring all Amazon teams to expose functionality only through service interfaces set up the conditions for AWS."
publishedAt: "2025-08-05"
category: "Amazon"
tags:
  - Engineering at Scale
  - Amazon
  - Microservices
  - Architecture
---

Much of what's publicly known about Amazon's famous internal API mandate comes from a single source: a 2011 internal Google memo written by then-Google engineer Steve Yegge, a former Amazon employee, that was accidentally made public and quickly went viral in engineering circles. Yegge described a set of rules Jeff Bezos reportedly imposed on Amazon engineering teams in the early 2000s, and while the memo is one person's recollection rather than an official Amazon document, its description of the mandate's substance has become widely cited because the architectural outcome — Amazon's shift to service-oriented architecture, and eventually AWS itself — is well documented independently.

## The rules, as described

The mandate, as Yegge recounted it, boiled down to a small number of blunt requirements: all teams must expose their data and functionality through service interfaces, teams must communicate with each other solely through those interfaces, no other form of inter-process communication was allowed — no direct linking, no direct reads of another team's datastore, no back-door shared-memory model, none of the shortcuts that make monoliths easy to build and hard to untangle later. On top of that, every service interface had to be designed from the ground up to be externalizable — built as though it might one day be exposed to developers outside the company, whether or not there was any concrete plan to do so at the time.

The consequence of skipping this discipline, in Yegge's telling, was blunt too: anyone who didn't comply would be fired. Whatever the precise accuracy of that detail, the broader point stands independent of it — treating internal APIs with the same design rigor as external ones is a genuinely unusual level of architectural discipline to impose company-wide, and Amazon's subsequent history suggests it was enforced seriously enough to actually change how teams built software.

## Why forcing interfaces mattered more than forcing microservices

The mandate is often retold today as "Amazon invented microservices," but that overstates the specific technology and understates the actual principle. What the mandate forced wasn't a particular deployment topology, it was strict interface discipline: teams could evolve their internal implementation however they liked, but the contract other teams depended on had to be a well-defined, versioned service interface, not an implicit dependency on internal details. That distinction is what let Amazon's engineering organization scale to many independent teams working in parallel without a small number of shared codebases becoming an ever-tightening bottleneck that every team had to coordinate through.

## The AWS payoff nobody explicitly planned

The mandate's most consequential side effect showed up years later. Because every team had already been forced to build genuinely externalizable service interfaces — designed as if an outside developer might call them — Amazon had, almost as a byproduct, built the architectural groundwork that made launching AWS as an external product dramatically more tractable than it would have been for a company whose internal systems were tightly coupled and never designed to be exposed. Amazon Web Services grew out of infrastructure services, compute and storage among the earliest, that existed first to serve Amazon's own internal service-oriented architecture.

## What you can borrow

- Require well-defined, versioned interfaces between teams even when everyone works in the same codebase or company — implicit coupling is technical debt that compounds.
- Design internal interfaces as though they might be exposed externally someday; the discipline it forces is worth it even if that day never comes.
- Let implementation evolve freely behind a stable interface — that's the actual mechanism that lets many teams move independently without stepping on each other.
- A strict architectural constraint imposed early can create optionality years later that nobody explicitly planned for at the time.
