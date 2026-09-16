---
title: "Shipping Hundreds of Times a Day: Shopify's Merge Queue and Deploy Pipeline"
slug: "shopify-deploy-pipeline-merge-queue-continuous-deployment"
description: "How Shopify keeps a single large Rails monolith deployable dozens of times daily using merge queues, canaries, and fast automated rollback."
publishedAt: "2025-10-05"
updatedAt: "2026-09-16"
category: "Shopify"
tags:
  - Engineering at Scale
  - Shopify
  - CI/CD
  - Ruby
---

A single monolithic Rails codebase with thousands of contributors sounds like a recipe for a slow, contentious deploy process — every merge risks breaking someone else's work, and the "master branch is red" problem multiplies with every additional engineer pushing code. Shopify instead built a pipeline that ships changes to production many times a day, out of a single core repository, by treating the merge and deploy process itself as a piece of infrastructure worth engineering carefully rather than a manual ceremony.

## The problem with a plain merge-on-green approach

The naive approach — run CI on a branch, merge if it passes, deploy — breaks down at high commit volume because of a race condition: two branches can each pass CI individually against the current main branch, but the combination of both changes together might not actually work. As the number of engineers merging into one repository grows, that kind of interaction failure becomes common enough to regularly break the main branch, which then blocks everyone else's deploys behind a manual investigation and revert.

Shopify's solution is a merge queue: rather than merging directly off a green CI run against a stale main, candidate changes are queued and tested against the actual state main will be in once earlier queued changes land, catching interaction bugs before they hit the trunk instead of after. This shifts the failure mode from "broken main blocks everyone" to "one queued change gets bounced back to its author," keeping the trunk deployable essentially all the time.

## Canaries and fast, automatic rollback

Getting code merged is only half the pipeline. Shopify deploys changes progressively rather than all at once — a canary stage routes a small slice of production traffic to the new version first, with automated health checks watching error rates and latency before the rollout continues to the full fleet. If a canary shows a regression, the pipeline is built to back out automatically rather than waiting for a human to notice a dashboard and manually intervene, which is what makes deploying dozens or hundreds of times a day survivable instead of terrifying.

```yaml
# conceptual shape of a progressive rollout stage
stages:
  - canary: 1%
    healthcheck: error_rate < baseline + threshold
  - canary: 25%
    healthcheck: error_rate < baseline + threshold
  - full_rollout: 100%
```

This progressive approach matters especially for a monolith serving many unrelated concerns at once — a regression in one feature area shouldn't take down checkout for every merchant, so the canary and rollback machinery is designed to catch and contain damage automatically at small blast radius before it reaches full production traffic.

## Making continuous deployment a cultural default

The technical pipeline only works because Shopify paired it with an engineering culture that expects small, frequent, independently deployable changes rather than large batched releases. Feature flags let incomplete work merge to trunk safely and get toggled on later, decoupling "merged" from "released" so engineers aren't incentivized to hold back changes waiting for a perfect moment. The combination — a merge queue that protects trunk stability, progressive canary rollouts with automatic rollback, and a culture built around small flagged changes — is what lets a monolith with a huge number of contributors stay both fast-moving and stable at the same time.

## A concrete failure mode for merge queues

A merge queue serializes main so each commit is tested with the commits ahead of it, which reduces the "green on the branch, red on main" tax. The failure mode is a queue so slow that engineers batch huge diffs or bypass it. Mid-size steal: a queue when CI is expensive and main is sacred, plus a fast path for reverts.

Operational gotcha: flaky tests that bounce the whole queue. One flake burns an hour of everyone else's work. Invest in quarantine with owners, or the queue becomes a flake amplifier. Another is combining the merge queue with mandatory preview apps that cannot keep up, so the queue waits on under-provisioned Kubernetes. Capacity-plan the queue like a production service. Shopify-scale monorepos need path-based CI so a docs change does not rebuild the world; without that, the queue is political. Hotfixes that skip tests will land, then the next queued item rebases onto a landmine. Steal a rule that skips still produce an artifact and a follow-up test. If your team is eight people and CI is twelve minutes, a simple "rebase and retest" bot may be enough. The lesson is protecting main as a deployable artifact, not installing a particular GitHub feature. Measure time-to-green after a broken main; that is the metric the queue exists to shrink.

## What you can borrow

- A merge queue that tests against the queue's actual eventual state, not just current main, catches interaction bugs a simple green-CI-then-merge process misses.
- Roll deploys out progressively with automated health checks, and make rollback automatic rather than dependent on someone noticing a dashboard.
- Decouple "merged" from "released" using feature flags so small changes can land continuously without waiting for a full feature to be ready.
- Trunk stability is worth investing in directly — every minute main is broken blocks every other engineer's deploy.
