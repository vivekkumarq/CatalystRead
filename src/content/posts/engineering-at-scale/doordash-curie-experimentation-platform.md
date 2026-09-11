---
title: "Curie: How DoorDash Runs Thousands of Experiments Without Losing the Signal"
slug: "doordash-curie-experimentation-platform"
description: "DoorDash built an internal experimentation platform, Curie, so any team can run statistically sound A/B tests without a data scientist gatekeeping every test."
publishedAt: "2026-02-24"
category: "DoorDash"
tags:
  - Engineering at Scale
  - DoorDash
  - Experimentation
  - Data Infrastructure
  - A/B Testing
sources:
  - title: "DoorDash Engineering Blog"
    publisher: "DoorDash"
    url: "https://careers.doordash.com/blog"
---

Every product change at a company DoorDash's size is, in principle, a hypothesis that should be tested rather than assumed to be an improvement — a new ranking tweak, a redesigned checkout button, a different Dasher pay model. Doing that rigorously at the volume a large, fast-moving product org actually operates at is a different problem than running the occasional A/B test by hand. DoorDash built an internal experimentation platform named Curie to let any team run statistically sound tests routinely, without each experiment requiring a data scientist to hand-check the methodology or manually pull the analysis together.

## Self-service, not gatekept

The core design goal behind Curie was making experimentation something a product or engineering team could do themselves, end to end — defining an experiment, assigning traffic to control and treatment groups, and reading a trustworthy readout of the results — without funneling every single test through a small, central data science team that would inevitably become the bottleneck once experimentation volume grew into the thousands. Self-service only works, though, if the platform itself enforces good statistical practice automatically, since a team without deep statistics expertise shouldn't need one to avoid common experimentation mistakes.

## Baking correctness into the platform, not the analyst

A recurring failure mode in ad hoc experimentation is teams peeking at results early and stopping a test the moment it looks favorable, which inflates false-positive rates in ways that aren't obvious unless you know to look for them. Platforms built for this kind of scale typically address it with variance-reduction and sequential-testing techniques baked into the standard analysis pipeline, so a team calling an experiment "significant" is getting a number that already accounts for these pitfalls rather than a naive statistical test run at an arbitrary stopping point. The platform, not each individual analyst, is what enforces rigor.

```text
Team defines experiment (metric, audience, variants)
        |
Curie assigns traffic, tracks exposure
        |
standardized analysis pipeline
(variance reduction, guardrail checks, significance)
        |
self-service results dashboard
```

## Guardrails that catch what the primary metric misses

An experiment's stated success metric might look great while quietly damaging something else the team wasn't explicitly watching — a checkout change that improves conversion but increases refund rates, for instance. A mature experimentation platform runs a standard set of guardrail metrics against every experiment automatically, regardless of what the team defined as their primary goal, so a regression in a core business or reliability metric gets flagged even if nobody thought to check for it manually.

## Thousands of experiments running at once, without stepping on each other

With enough concurrent experiments running across a platform this size, tests inevitably start to overlap on the same users and the same surfaces, which risks interaction effects where one experiment's treatment skews another experiment's results. Managing this requires careful traffic allocation and namespacing — deciding which experiments can safely run concurrently against overlapping populations, and which need to be mutually exclusive — so that the platform's own scale doesn't undermine the validity of the results it's producing.

## What you can borrow

- Push statistical rigor into the platform itself rather than relying on each analyst to apply it correctly by hand every time.
- Self-service experimentation only scales safely if the platform enforces good practice automatically; without that, self-service just scales the mistakes too.
- Run a standard set of guardrail metrics against every experiment by default, not just the metric the team chose to optimize.
- Plan for interaction effects between concurrent experiments once your test volume grows past a handful running at a time.
