---
title: "Feature Flags Architecture: Beyond the Boolean Toggle"
slug: "feature-flags-architecture"
description: "Release flags, experiment flags, and ops flags need different lifecycles — a flag system without a removal process always accumulates debt."
publishedAt: "2026-01-19"
updatedAt: "2026-09-16"
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

## A worked example

Flags in a service with targeting (user, %, env). Code: `if (flags.isOn("new-checkout", ctx))`. Cleanup ticket when the flag hits 100%. Server-evaluated for security-sensitive flags. Defaults fail closed for risky features. A dashboard with who changed what.

Kill switch for a dependency outage, separate from experiments.

## Failure modes

Flags forever. Combinatorial explosions (5 flags = 32 worlds). Client-side flags that reveal unpaid features without server checks. Config in git that needs a deploy. No targeting, only global. Flags that change mid-request inconsistently.

Testing only the default path.

## When this is the wrong tool

A one-time migration that can be a deploy. Flags are not permissions (use authz). Do not flag every CSS color. If you cannot operate a flag service, env vars for a weekend may be enough. Experiments need statistics, not just flags. Trunk-based development without flags is possible with branch-by-abstraction for some changes.

## A worked failure mode

Flags accumulate; a boolean soup means no one can reason about prod. A flag is reused for a different meaning. The default in code is true and the flag service is down, flipping everyone on. The failure is flags without lifecycle. Name, owner, expiry, default-safe, and delete.

Flags are the wrong tool for configuration that is not temporary. They are the wrong way to hide incomplete security. Do not wrap every line. Use flags for staged rollout and kill switches you will remove.

The wrong-tool test is easier with a concrete customer. If a user can lose money, lose access, or see someone else's data when "Feature Flags Architecture: Beyond the Boolean Toggle" is slightly misapplied, do not let the pattern ride on defaults. Tighten the API, add an assertion in CI, and refuse silent fallbacks that look like success. Most production failures here are not exotic; they are a missing bound, a missing key, or a missing check that the original paper assumed a careful operator would have.
