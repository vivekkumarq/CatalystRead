---
title: "Airbnb's Long Road From a Rails Monolith to Services"
slug: "airbnb-rails-monolith-to-services-migration"
description: "Airbnb's honest account of splitting its Rails monolith into services, the sprawl it caused, and the platform investment that fixed it."
publishedAt: "2025-08-29"
updatedAt: "2026-09-16"
category: "Airbnb"
tags:
  - Engineering at Scale
  - Airbnb
  - Microservices
  - Ruby on Rails
---

Airbnb started, like most successful startups of its era, as a single Ruby on Rails application — internally known as Monorail. That monolith let a small team move fast: one codebase, one deploy, no network calls between features. It also did exactly what monoliths do as a company grows: as engineering headcount climbed into the hundreds and the codebase kept accumulating unrelated features, the test suite slowed to a crawl, deploys became a coordination bottleneck across dozens of teams, and ownership boundaries blurred until it was genuinely unclear which team was responsible for a given piece of logic.

## The move to services, and its cost

In the mid-2010s, Airbnb began decomposing Monorail into services — a shift most fast-growing engineering orgs make for similar reasons: independent deploys, clearer ownership, and the ability for teams to choose their own release cadence without blocking each other. What made Airbnb's account notable is how candidly their engineering blog described the downside. Without strong standards for how services should be built, monitored, and operated, the company ended up with a large number of inconsistently built services — some well-instrumented and owned, others closer to orphaned code with unclear on-call responsibility. The result was a new kind of complexity: more network calls, more places for cascading failures to start, and harder debugging across service boundaries, without a proportional improvement in team velocity. Airbnb's engineers described this pattern plainly as microservices sprawl.

## Fixing sprawl with platform investment

Airbnb's response wasn't to abandon services and go back to the monolith wholesale — it was to treat the problem as a tooling and standards gap, not a strategy gap. They invested in a service creation platform: standardized templates for spinning up a new service correctly from day one, consistent RPC conventions (using Thrift for typed service-to-service communication), and clearer expectations around ownership and on-call. They also worked to consolidate or retire services where the operational overhead of running a separate service clearly outweighed the benefit of splitting it out in the first place — an idea that echoed a broader industry conversation happening around the same time about "majestic monoliths," most associated with Shopify's public stance on staying largely monolithic.

Airbnb's data infrastructure work grew out of the same pressures. Airflow, the workflow orchestration tool Airbnb built internally and later open sourced, was created in large part to manage the increasingly complex web of batch jobs and data pipelines that came with a more distributed system landscape — it became one of Airbnb's most widely adopted external contributions to the broader engineering community.

## What broke when they scaled

Monorail's pain was concrete: a shared test suite and a shared deploy train. Splitting services moved the pain into the network. Request fan-out from a page that used to be a few ActiveRecord queries became a chain of RPCs. Timeouts had to be chosen; retries without idempotency duplicated side effects; a missing request ID made a user-facing 500 into an hour of grep across logs. Partial extracts left "strangler" seams where the monolith still owned the source of truth and services cached or dual-wrote — classic consistency bugs around bookings, messaging, and pricing.

Sprawl had a staffing shape. A service created for one team's velocity became unowned after a reorg. Without a service catalog, SLOs, and a standard for authn/authz on every Thrift endpoint, the platform team spent its time on the worst snowflakes. Airbnb's later investment in service templates, SOA conventions, and retiring low-value services was an admission that the first wave of splits optimized for team independence without pricing in the operational tax.

Data also lagged. Batch jobs that once read monolith tables had to subscribe to events or query new stores. That is the environment Airflow grew up in: not only "schedule my ETL" but "the company is now a graph of jobs and services, and cron cannot see the graph."

## A smaller-team version of the same idea

Extract along an already-painful axis — a bounded domain with a clear owner, an independent scale profile (search, payments, messaging), or a deploy bottleneck that is measurably blocking others. Keep a modular monolith for everything else: packages, APIs, and test boundaries inside one deploy. Standardize RPC, logging, and on-call *before* the fifth service. Measure service count and orphan rate. If you cannot name the on-call and the SLO, it is not a service yet; it is a repo.

## What you can borrow

- Don't split a monolith into services until deploy contention or team-coordination pain is actually hurting velocity — splitting for its own sake adds network-call complexity you don't yet need.
- Build the golden-path tooling (service templates, RPC conventions, on-call standards) before mass service creation, not after sprawl has already happened.
- Track service count and ownership clarity as a cost the organization is paying, not a sign of architectural maturity.
- Be willing to consolidate low-traffic or thinly-owned services back together — decomposition isn't a one-way door, and reversing part of it is sometimes the right call.
