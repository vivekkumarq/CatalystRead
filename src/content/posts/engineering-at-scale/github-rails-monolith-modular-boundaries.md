---
title: "Why GitHub Kept the Rails Monolith — and Drew Boundaries Inside It"
slug: "github-rails-monolith-modular-boundaries"
description: "GitHub's github/github Rails application grew for over a decade without a microservices rewrite, using internal modularity instead of a network split."
publishedAt: "2025-08-02"
category: "GitHub"
tags:
  - Engineering at Scale
  - GitHub
  - Ruby on Rails
  - Monolith
  - Software Architecture
sources:
  - title: "GitHub Engineering Blog"
    publisher: "GitHub"
    url: "https://github.blog/engineering"
---

By the mid-2010s, GitHub's main Rails application — internally known as `github/github` — had been growing for years, accumulating features, teams, and contributors the way any successful product does. The industry-standard advice for a monolith at that size was to break it into microservices: separate deployables, separate databases, services talking over the network. GitHub largely didn't do that, at least not as a wholesale rewrite. It kept the Rails application as the primary home for the product and instead invested in making the monolith itself more modular, while carving out only the pieces that had a genuinely strong reason to be separate services — things like Git hosting infrastructure, authentication, and webhooks processing.

## The case against a rewrite

A full microservices rewrite of a mature, revenue-critical product carries real costs that are easy to underweight in the abstract: you freeze feature work on the old system for years while you rebuild, you introduce a distributed system's failure modes (partial failures, network latency, eventual consistency) in place of a single process's simpler failure modes, and you multiply operational surface area — more services to deploy, monitor, and keep available. For a company whose product depends on that same reliability, betting years of engineering capacity on a rewrite is a bet against the customers who need features and fixes in the meantime.

GitHub's own experience with services it did split out — like the routing and storage layer that would later become DGit/Spokes — showed that service boundaries make sense where there's a real independent scaling or reliability requirement, not just because a component "feels" like it should be separate.

## Modularity without new network calls

Instead of a network boundary, GitHub invested in enforcing boundaries inside the single Rails codebase:

- **Domain-oriented directory structure**, organizing code by business domain rather than only by Rails convention (models, views, controllers), so a feature's logic lives together.
- **Load-order and dependency tooling** to catch code that reaches across a boundary it shouldn't, turning implicit conventions into something closer to a compiler-checked rule.
- **Feature flags** as a first-class mechanism, letting the team ship code dark, roll it out gradually, and turn it off instantly without a deploy — a pattern that substitutes for a lot of what people expect a service boundary to buy them.

This gets you much of what a service boundary is meant to provide — isolated ownership, the ability to reason about one part of the system without loading the whole thing into your head — without paying for a distributed system before you actually need one.

## Where GitHub did split services

The approach was pragmatic, not dogmatic. Git itself — the actual repository storage and retrieval layer — was pulled out into dedicated infrastructure (what became Spokes/DGit), because replicating and serving git data at GitHub's scale is a genuinely different problem with different scaling and reliability characteristics than rendering a pull request page. Similarly, high-volume, latency-sensitive paths like webhook delivery and Git protocol handling got their own services over time. The dividing line GitHub tended to use was whether a component had scaling needs, failure isolation needs, or a team-ownership story that a monolith module couldn't satisfy — not a general belief that services are inherently better architecture.

## What you can borrow

- Don't treat "break into microservices" as the default answer to monolith growing pains — a monolith with enforced internal module boundaries solves the same organizational scaling problem for a fraction of the operational cost.
- Reserve service extraction for components with a genuinely distinct scaling, reliability, or ownership profile — not just because a directory feels big.
- Invest in tooling that makes boundary violations visible or impossible (dependency linting, load-order enforcement) rather than relying on engineers remembering conventions.
- Use feature flags as a substitute for some of what teams reach for services to get: independent rollout, dark launches, instant rollback.
- Revisit the monolith-vs-service question per component, not once for the whole system — the right architecture is rarely uniform across a large product.
