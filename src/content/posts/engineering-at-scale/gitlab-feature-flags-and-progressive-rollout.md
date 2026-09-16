---
title: "GitLab Feature Flags: Progressive Rollout Without a Second Deploy Train"
slug: "gitlab-feature-flags-and-progressive-rollout"
description: "How GitLab built feature flags on an Unleash-compatible model so code can ship dark and roll out by percentage, actor, or environment."
publishedAt: "2026-11-18"
updatedAt: "2026-11-18"
category: "GitLab"
tags:
  - Engineering at Scale
  - GitLab
  - Feature Flags
  - Continuous Delivery
sources:
  - title: "GitLab Feature Flags"
    publisher: "GitLab"
    url: "https://docs.gitlab.com/operations/feature_flags/"
  - title: "Unleash"
    publisher: "Unleash"
    url: "https://docs.getunleash.io"
---

A deploy is a terrible feature toggle. It couples "the bits are on the machines" to "everyone should see the new checkout flow," and the rollback is another deploy that might not be fast enough. GitLab's feature flag product — used both as a GitLab.com capability and as the same pattern inside GitLab the application — treats flags as data evaluated at runtime, with strategies for percentage rollouts, user lists, and environments. The implementation lineage is Unleash-compatible APIs, which mattered more than branding: SDKs already existed, and GitLab did not need a new client dialect for every language in a polyglot estate.

## Flags as a release primitive

The useful model is: merge to main is allowed because the dangerous path is dark. A flag strategy then chooses who sees it — 5% of sessions, a staff actor, a single customer tenant. Environments keep staging from sharing prod's toggle state by accident. GitLab ties flags to a project so the permission model matches the repo, which is a quieter insight than the SDK: a flag nobody can find in the product that shipped it will live forever.

Evaluation can happen in-process via a relayed snapshot of flag definitions, or via a service. The trade-off is the same as every config system. If every request asks a remote flag API, the flag service is now on the latency path and a timeout becomes a default. SDKs that poll and cache, with a last-known-good file, are how you survive the flag service taking a nap. Defaults must be explicit: fail closed for a billing change, fail open for a cosmetic experiment.

## Progressive delivery is not just percentages

A percentage rollout without sticky assignment is a flicker. The same user must keep seeing the same variant or you cannot debug and you cannot measure. Actor IDs — user id, project id, a hashed session — pin the bucket. GitLab's strategies include user lists and application-specific actors because "5% of requests" on an API is not "5% of customers."

Cleanup is the unglamorous half. Flags that remain in code after 100% rollout are a second configuration language, with dead branches that still compile. GitLab the product can list stale flags; GitLab the engineering org still has to delete them. A flag that gates a database migration is a particularly sharp edge: the old code path must keep working until the new schema is everywhere, and then the flag must die or you will run two worlds indefinitely.

## Failure modes of runtime flags

The concrete failure is a flag check in a hot inner loop that does a network call, plus a default that enables a write path when the SDK cannot reach the API. You have built an outage amplifier. Mid-size steal: in-memory snapshots, short poll intervals, and documented defaults per flag.

Operational gotcha: using flags as a permission system ("only enterprise sees this") without auditing them like authz. A flag name in a frontend bundle can be flipped by a user if evaluation is only client-side. Evaluate security-relevant flags on the server. Another is a percentage rollout that includes your largest tenant in the first 5% because hashing was on request id, not account id. Hash the actor you care about. Coordinate flags with migrations: expanding a column behind a flag still requires a backward-compatible schema first. If you attach flags to GitLab environments but deploy with a tool that does not set the environment name, every flag is "off" in prod and "on" in the dashboard you were looking at. Log the flag snapshot version in canonical request logs so an incident review can say which variant ran.

## What you can borrow

- Ship dark and roll out by sticky actor, not by hoping a deploy equals a release.
- Cache flag definitions in the process; never make the flag API a per-request dependency.
- Evaluate authorization-sensitive flags on the server, not only in a browser SDK.
- Delete flags at 100% with the same urgency you used to add them, especially when they gate schema.
