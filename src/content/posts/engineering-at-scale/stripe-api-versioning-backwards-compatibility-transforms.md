---
title: "How Stripe Keeps a Decade of API Versions Backwards Compatible"
slug: "stripe-api-versioning-backwards-compatibility-transforms"
description: "Stripe's approach to API versioning uses per-account pinned versions and request/response transforms instead of forcing every integration onto the latest shape."
publishedAt: "2025-08-09"
category: "Stripe"
tags:
  - Engineering at Scale
  - Stripe
  - API Design
  - Backwards Compatibility
---

Most APIs handle breaking changes by bumping a major version number and asking every integrator to migrate on their own schedule, which in practice means old versions get deprecated, integrators scramble, and some get left behind entirely. Stripe's payments API sits underneath businesses that can't afford a broken integration — a checkout flow that silently starts failing is a direct revenue hit. Stripe's public engineering writing has described an alternative approach: instead of a small number of major versions, every account is pinned to the exact API version active when it first integrated, and that version keeps working indefinitely.

## Dated versions instead of major/minor numbers

Stripe issues a new API version, identified by a date, whenever a change would otherwise break existing integrations — a field renamed, a response shape altered, a parameter made required. A new Stripe account is automatically pinned to whatever the current version is at signup, and every request from that account is served as if that version were still the live API, even years later and even as Stripe's internal API surface has moved far beyond it. This means Stripe accumulates a long tail of active versions in production simultaneously, not just a couple of supported major versions.

## Transformations, not forked code paths

The key to making this sustainable is that Stripe doesn't maintain separate implementations of the API for each version. Internally, the API has one current implementation. Each versioned change is captured as a small, isolated transformation — a function that adjusts an incoming request from an old version's shape into the current shape before it hits business logic, and adjusts the outgoing response from the current shape back into the old version's shape before it's returned. A request from an account pinned to a version from several years ago passes through the chain of transforms for every version between then and now, in sequence, before reaching current code. This keeps the actual business logic single-pathed and testable, while compatibility becomes a composable, independently reviewable layer sitting at the edge.

## Why this trade-off makes sense for Stripe

The cost is real: the transform chain grows over time, and every new versioned change adds a link that has to keep working correctly for the life of the API. Stripe accepts that cost because the alternative — periodically forcing thousands of businesses to update integration code on Stripe's timeline — is worse for a payments API specifically, where a broken integration means lost transactions and support burden that customers didn't sign up for. This isn't a universal answer; it makes the most sense when your API sits underneath many independent, often unmaintained integrations where a forced migration is expensive to your users, not just inconvenient.

## What you can borrow

- Decide whether breaking changes are best absorbed by you (via a compatibility layer) or by your API consumers (via forced migration) — the right answer depends on how many integrators you have and how costly a broken integration is for them.
- Representing each breaking change as an isolated, composable transform keeps your core business logic on one code path instead of forking it per version, which is far easier to reason about and test.
- Pinning behavior to "whatever was current when you joined" is a simple default that avoids surprise breakage without requiring consumers to explicitly opt into a version.
- Any compatibility strategy has an ongoing maintenance cost — budget for it explicitly rather than treating backwards compatibility as free once the mechanism exists.
