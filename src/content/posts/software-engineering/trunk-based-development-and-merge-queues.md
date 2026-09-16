---
title: "Trunk-Based Development and Merge Queues"
slug: "trunk-based-development-and-merge-queues"
description: "How trunk-based development and merge queues reduce integration pain compared to long-lived feature branches, and what they require to work in practice."
publishedAt: "2025-10-15"
updatedAt: "2026-09-16"
category: "Software Engineering"
tags:
  - Software Engineering
  - DevOps
  - CI/CD
  - Engineering Culture
---

Long-lived feature branches feel safe in the moment and expensive in aggregate. Each one defers integration to some future date, and the cost of merging doesn't shrink while it waits — it grows, because every day the branch and trunk diverge, both accumulate changes that have to be reconciled eventually. Trunk-based development is a bet that paying the integration cost continuously, in small daily increments, is cheaper than paying it all at once at the end.

## What trunk-based development actually requires

The practice itself is simple to state: everyone commits to a single shared branch frequently, typically at least daily, rather than working in isolation for days or weeks. What makes it viable is everything that has to be true for frequent integration to not break the trunk constantly.

Incomplete work has to be safe to merge, which means feature flags do the job branches used to do — a half-built feature lives behind a flag, gets merged into trunk in pieces, and stays dark in production until it's ready, rather than living in isolation on a branch until it's finished. This decouples "merged" from "released," which is the property that makes daily integration tolerable instead of terrifying.

Fast, reliable CI is non-negotiable, because trunk-based development only works if a broken trunk gets caught and fixed within minutes, not discovered by the next person who pulls hours later. A test suite that takes forty minutes, or one with enough flaky tests that failures get reflexively re-run instead of investigated, undermines the entire premise.

## Merge queues close the last gap

Even with fast CI, two changes can each pass tests independently against trunk and still break trunk when combined, if they touch related code in incompatible ways. A merge queue closes this gap by testing each candidate change against the trunk state as it will actually exist after every change ahead of it in the queue has merged, not just against the trunk as it exists when the change was proposed.

```yaml
# Example: GitHub merge queue configuration
merge_group:
  branches: [main]
  build_concurrency: 5

# Each PR is tested against trunk + all queued changes ahead of it,
# not against a possibly-stale base branch snapshot.
```

This matters more as team size and merge frequency grow. At low volume, the odds of two conflicting changes landing close together are low enough that manual rebasing catches most problems. At high volume, a merge queue is the difference between trunk staying green and trunk breaking multiple times a day from combinations nobody tested together.

## What this trades away, and what it doesn't

Teams moving from long-lived branches often worry trunk-based development means losing the isolation that let them work on something risky without affecting others. In practice, feature flags provide that isolation at the runtime level instead of the source control level, which is usually a better trade — the code is integrated and tested continuously even while the feature is dark, instead of accumulating merge debt in the dark.

The real prerequisite most teams underestimate is investment in the test suite and CI infrastructure before adopting this workflow, not after. Trunk-based development doesn't create the discipline of small, frequent, well-tested changes — it requires that discipline already exist, or it just becomes a way to break trunk faster than a branch-heavy workflow ever could.

## A worked example

Main is always green. PRs small, merge queue rebases and runs CI, then merge. Feature flags for unfinished work. No GitFlow release branches for a SaaS. A broken main stops the queue.

You measure time in review, not branch age of weeks.

## Failure modes

Queues that serialize the company (one slow test). Long-lived feature branches labeled "trunk." Merge queue without required checks. Skipping the queue with admin merge. Flags without cleanup. Requiring 10 approvals plus the queue.

Nightly-only tests so the queue is theater.

## When this is the wrong tool

Regulated release trains that need a branch — still integrate to main often. Open source with infrequent maintainers may use GitHub flow with longer PRs. A solo hobby repo does not need a merge queue. TBD is the wrong fight while CI is 90 minutes and flaky — fix CI first. Do not trunk-based a binary you cannot flag if you have no other hiding technique.
