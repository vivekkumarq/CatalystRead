---
title: "DORA Metrics: What Four Numbers Measure, and What They Hide"
slug: "dora-metrics-delivery-performance"
description: "Lead time, deploy frequency, change fail rate, and time to restore — how to collect them honestly, and how teams game the dashboard."
publishedAt: "2026-08-24"
updatedAt: "2026-09-16"
category: "DevOps"
tags:
  - DevOps
  - Metrics
  - Continuous Delivery
  - Engineering Culture
sources:
  - title: "Accelerate: The Science of Lean Software and DevOps"
    author: "Nicole Forsgren, Jez Humble, Gene Kim"
    publisher: "IT Revolution, 2018"
    url: "https://itrevolution.com/product/accelerate/"
---

The DORA research program (Forsgren, Humble, Kim, and later Google Cloud's reports) correlated four delivery metrics with organizational performance. They are useful because they are few. They become harmful when a VP treats them as a scoreboard for individuals, or when a team optimizes the numerator by changing the definition of "deploy."

## The four measures, operationally

**Deployment frequency** is how often you ship to production, not how often you merge to main. A batch of ten services released by one pipeline is one production event if users see them together; counting each microservice separately inflates the number without shrinking batch size.

**Lead time for changes** is commit (or first PR commit) to production, not ticket-in-Jira to commit. If your clock starts when someone remembers to move a ticket, you are measuring process theater. The research cares about the *delivery system*: how long code sits before it is in users' hands.

**Change failure rate** needs a definition of failure written down: rollback, hotfix, or Sev-1 caused by the release. Without that, people stop tagging incidents as related to deploys.

**Time to restore** is incident clock, not "when we posted in Slack." Start at user impact, end at mitigated. A four-hour "investigation" with a one-line revert at minute five should not look like a four-hour outage.

## Gaming, and how to notice it

- Tiny no-op deploys to raise frequency.
- Lead time that excludes weekends by using business hours only, then comparing to a 24/7 competitor.
- Moving work to "config" or feature flags so the git commit looks instant while the real launch is a week of manual checklist.
- Restoring service by disabling the feature for everyone, then not counting the remaining broken cohort.

None of these are illegal. They just disconnect the metric from the thing the research was about: small batches, fast feedback, and recovery skill.

## Use them as system sensors

Plot the four together. High frequency with high fail rate is a pipeline that ships unfinished work. Low frequency with long restore is a scary combination: you do not practice recovery. Improving CI cache and test selection often moves lead time more than a pep talk about culture.

Read *Accelerate* for the survey methodology and the warning that copying elite percentiles without copying the practices (trunk-based development, test automation, loosely coupled architecture) is cargo cult. The numbers are a diagnostic. The work is still in the pipeline and the architecture.

## A worked reading of a dashboard

Frequency is daily, lead time is four days, change-fail is 25%, restore is 90 minutes. The story is not “we deploy a lot.” It is “code sits in review or a slow e2e, then production breaks often, and we are merely okay at recovery.” The first lever is usually the wait before the first production-bound artifact (review SLA, flaky tests), not a pep talk about deploying more. After you shrink lead time, watch fail rate: if it climbs, you sped up an unsafe pipeline.

Compare quarters, not individuals. A team that owns a hardware integration will not match a serverless CRUD squad; the research compared *organizations* and capabilities, not tickets per engineer.

## Failure modes

**Per-person scoreboards.** People split PRs and stop touching risky code. The metric dies as a system sensor.

**Clock games.** Lead time from “pipeline start” instead of first commit; frequency that counts helm-only no-ops.

**One metric OKRs.** “Increase deploy frequency 2×” without a fail-rate cap produces the no-op deploy pattern.

**Mixing batch size with microservice count.** Ten repos released together are one user-facing change.

## When not to use DORA as the frame

A platform team that ships once a quarter because of a store review still has internal CD (build, test, promote) worth measuring, but public “elite” percentiles will only shame them. Research prototypes with no production users do not need restore-time dashboards. If you lack even a definition of production deploy, fix that event first — DORA on top of undefined deploys is fiction.

## Review checklist

- Written definitions: deploy, failure, restore start/stop, lead-time start.
- All four plotted together; no individual ranking.
- Gaming patterns reviewed quarterly (no-ops, flag-hidden launches).
- Practices (trunk, tests, coupling) are the work items, not “hit elite.”

## A worked failure mode

A team games lead time by opening PRs that are already merged locally and by excluding hotfixes from change-fail rate. Dashboards go elite; customers still wait six weeks for a feature behind a flag that never turns on. Another org pages engineers for failing to ship daily on a hardware product with a certification gate. The failure is treating DORA as a scoreboard instead of a diagnostic. Use the four metrics to find bottlenecks (review queues, flaky tests, scary deploys), not to punish.

## When this is the wrong tool

DORA charts are the wrong tool if leaders will rank teams with them. They are a poor fit for work that is not software deploy (research, legal). Do not optimize deploy count by shipping empty commits. Use DORA when you want to improve flow and have a shared definition of a production change.

When this pattern is stretched past its assumptions, the first outage looks like a mysterious performance cliff instead of a design limit. "DORA Metrics: What Four Numbers Measure, and What They Hide" fails that way when traffic mix, data shape, or team skill does not match the blog that sold the approach. Keep a kill switch: feature flag, smaller blast radius, or an older path that still works. Measure the thing the idea claims to improve, not a vanity graph. If you cannot name a workload where you would refuse to use it, you have not finished the design.
