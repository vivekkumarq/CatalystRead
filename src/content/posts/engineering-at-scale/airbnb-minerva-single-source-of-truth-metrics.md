---
title: "Minerva: How Airbnb Built One Source of Truth for Metrics"
slug: "airbnb-minerva-single-source-of-truth-metrics"
description: "Why Airbnb kept getting conflicting numbers for the same metric across teams, and how Minerva's centralized definitions and certification process fixed it."
publishedAt: "2025-12-25"
category: "Airbnb"
tags:
  - Engineering at Scale
  - Airbnb
  - Data Engineering
  - Metrics
---

A recurring failure mode at fast-growing data-driven companies is that two teams present two different numbers for what's supposedly the same metric — "active users" computed one way by the growth team and a subtly different way by the finance team — and nobody can say with confidence which one is right, or why they disagree. Airbnb hit this problem seriously enough that it became a named internal initiative: dashboards proliferated, each analyst wrote their own SQL to compute familiar-sounding metrics like bookings or nights booked, and small differences in filtering or date-boundary logic meant the same metric name quietly meant different things in different reports.

## The cost of ungoverned metric definitions

The practical damage wasn't abstract. Leadership meetings where two teams brought conflicting numbers to the same question burned time relitigating whose SQL was correct instead of discussing what the data meant. Trust in dashboards eroded, because a viewer had no way to know whether a given number came from a vetted, reviewed definition or from one analyst's ad hoc query written for a one-off analysis months earlier and never revisited. As more of the company's decisions leaned on data, this stopped being a nuisance and became a real risk to decision quality.

## Minerva's approach: centralize the definition, not just the data

Airbnb's response, described in its engineering blog as the Minerva platform, centered on separating metric definitions from the queries that compute them. Instead of every analyst writing their own SQL against raw tables, metrics were defined once — a metric's logic, its dimensions, its filters — in a central registry, and Minerva generated the actual queries and pipelines from that single definition. Anyone consuming "nights booked" anywhere in the company, whether in a dashboard, an experiment analysis, or an ad hoc query tool, was drawing from the same governed definition rather than a personally maintained copy of similar logic.

## Certification as a trust signal

Centralizing definitions alone doesn't guarantee correctness — someone still has to get the definition right and keep it right as the underlying data model evolves. Minerva introduced a certification process: a metric could carry a badge indicating it had been reviewed and approved by people with authority over that domain, distinguishing a trustworthy, governed metric from an exploratory one someone was still iterating on. This gave consumers a fast, visible signal about how much confidence to place in a number without needing to audit the underlying query themselves every time.

## What you can borrow

- If two teams routinely present conflicting numbers for the same metric name, the root cause is almost always duplicated, independently maintained logic — the fix is a shared, single definition, not better communication about whose number to trust.
- Separating "what a metric means" from "how it's computed and where it's served" lets you change the computation (performance, backend) without touching what every downstream consumer relies on.
- A visible certification or trust signal on a metric costs little to add and saves consumers from re-auditing a query's correctness every time they use it.
- Metric governance is an ongoing process, not a one-time migration — definitions need owners who keep them correct as the underlying data model changes.
