---
title: "DORA Metrics: What Four Numbers Measure, and What They Hide"
slug: "dora-metrics-delivery-performance"
description: "Lead time, deploy frequency, change fail rate, and time to restore — how to collect them honestly, and how teams game the dashboard."
publishedAt: "2026-08-24"
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
