---
title: "Feature Flags Architecture: Beyond the Boolean Toggle"
slug: "feature-flags-architecture"
description: "Release flags, experiment flags, and ops flags need different lifecycles — a flag system without a removal process always accumulates debt."
publishedAt: "2026-01-19"
category: "Software Engineering"
tags:
  - Software Engineering
  - Software Architecture
  - DevOps
  - Engineering Practices
---

A feature flag that's just an `if (flagEnabled) { ... }` scattered through a codebase works for a demo and becomes a liability within a quarter — stale flags nobody removes, flag checks that diverge in behavior between services, and no record of who's actually being served which variant. Flag systems that stay healthy at scale treat flags as a first-class piece of infrastructure with its own lifecycle, not a boolean sprinkled into `if` statements.

## Flags Are Not One Thing

Different flag types have genuinely different requirements, and conflating them is the root of most flag sprawl:

| Type | Lifetime | Example | Cleanup expectation |
| ---- | -------- | -------- | -------------------- |
| Release flag | Days to weeks | Hide unfinished feature | Removed once fully rolled out |
| Experiment flag | Weeks | A/B test variant | Removed once experiment concludes |
| Ops flag | Indefinite | Circuit breaker, kill switch | Kept — this is its job |
| Permission flag | Indefinite | Entitlement, plan tier | Kept — this is config, not a temporary flag |

Treating a release flag like an ops flag — never scheduling its removal — is how a codebase ends up with three-year-old conditionals nobody remembers the purpose of, still being evaluated on every request.

## Evaluation Has to Be Fast and Local

The naive implementation calls a flag service over the network on every check — untenable at request-hot-path scale. Production flag systems instead push rule sets to each service (via SDK, polling, or streaming updates) and evaluate locally, in-process, against the cached rule set:

```python
# Evaluation is a local, in-memory decision — no network call per check
def is_enabled(flag_key: str, context: EvaluationContext) -> bool:
    rules = local_flag_cache.get(flag_key)
    return rules.evaluate(context)  # context: user id, plan, region, etc.
```

The service periodically refreshes the local cache in the background, so a flag change propagates within seconds to minutes, not instantly — a deliberate trade of a small propagation delay for zero added latency on the request path.

## Targeting Rules Need Consistent Hashing, Not Random Sampling

A percentage rollout ("10% of users") has to assign the *same* user to the same bucket on every evaluation — a user flickering between enabled and disabled across requests is worse than the flag not existing. The standard mechanism hashes a stable identifier (user ID) plus the flag key into a bucket:

```python
def in_rollout(user_id: str, flag_key: str, percentage: int) -> bool:
    bucket = int(hashlib.md5(f"{user_id}:{flag_key}".encode()).hexdigest(), 16) % 100
    return bucket < percentage
```

Hashing in the flag key alongside the user ID matters — it means a user's bucket for one flag is independent of their bucket for another, so rollouts don't correlate in ways that skew experiment results.

## The Part Everyone Skips: Removal

A flag system's real long-term cost isn't evaluation latency — it's the combinatorial explosion of code paths from flags nobody has removed. The fix has to be procedural, not just technical: every release flag gets an owner and an expected removal date at creation time, and dashboards surface flags past their expected lifetime for cleanup, the same way stale branches or unused dependencies get flagged. A flag system without an enforced removal process will always trend toward permanent flag debt, regardless of how clean the evaluation code is.
