---
title: "Inside LinkedIn's A/B Testing Platform and Experimentation Culture"
slug: "linkedin-ab-testing-experimentation-platform"
description: "How LinkedIn built T-REX, its internal experimentation platform, to make running and trusting thousands of concurrent A/B tests routine rather than risky."
publishedAt: "2025-08-05"
updatedAt: "2026-09-16"
category: "LinkedIn"
tags:
  - Engineering at Scale
  - LinkedIn
  - Experimentation
  - Data Infrastructure
sources:
  - title: "LinkedIn Engineering Blog"
    publisher: "LinkedIn"
    url: "https://engineering.linkedin.com"
---

At LinkedIn's scale, nearly every product change — a new ranking model for the feed, a redesigned notification, a tweak to the connection recommendation algorithm — needed to be validated against real member behavior before it could be trusted. Running that many experiments safely and honestly is a much harder problem than it sounds: you need consistent, collision-free bucketing of members into treatment and control groups across dozens of concurrent tests, a metrics pipeline that can compute statistically valid results at scale without engineers hand-rolling analysis each time, and enough scar tissue built into the platform to stop people from accidentally shipping changes based on noise. LinkedIn built an internal experimentation platform, referred to internally as T-REX, to make trustworthy experimentation something teams could self-serve rather than something that required a statistician's involvement every time.

## Consistent hashing for clean bucketing

The foundation of the platform was a consistent hashing scheme that assigned each member to a treatment bucket based on a hash of their member ID combined with an experiment identifier. This guaranteed that a given member landed in the same bucket for the life of an experiment regardless of which server handled their request, without needing a centralized lookup table mapping members to bucket assignments. Because the hash incorporated the experiment ID, the same member could be independently and unpredictably bucketed across many concurrent, unrelated experiments, which let LinkedIn run thousands of experiments at once without them systematically interfering with each other's treatment assignment.

Layered on top of bucketing was a segmentation and targeting system, letting teams scope an experiment to a subset of members — by geography, platform, or membership in another experiment's segment — and layers or domains that partitioned the overall traffic so that mutually exclusive experiments (like two different tests of the same ranking component) couldn't accidentally run on the same members at the same time.

## Metrics as a shared, trusted contract

Rather than letting each team define and compute its own success metrics ad hoc, the platform centered on a shared metrics repository: a catalog of well-defined, vetted metrics — engagement rates, session metrics, revenue proxies, guardrail metrics like page load latency — that any experiment could pull in automatically. This meant an experiment owner didn't need to write their own aggregation logic or convince a statistics reviewer that their custom metric was computed correctly each time; they attached existing, trusted metrics to their experiment and got results in a standard format, with statistical significance testing built into the pipeline rather than left to manual spreadsheet work.

```
member_id + experiment_id --> hash --> bucket assignment
                                            |
                                     exposure logged
                                            |
                          metrics pipeline joins exposures to events
                                            |
                              significance testing --> scorecard
```

## Guardrails against false positives at scale

Running thousands of concurrent experiments creates a subtle statistical hazard: if enough tests are run, some will show "significant" results purely by chance. LinkedIn's platform incorporated guardrail metrics that were automatically checked on every experiment regardless of what the experimenter was targeting, catching regressions in core health metrics like latency or error rates even when a team's own success metric looked fine. The platform also enforced practices like minimum sample sizes and experiment durations before allowing results to be treated as conclusive, pushing back against the natural instinct to call a winner the moment a metric first crosses a significance threshold.

## Operational gotchas when thousands of tests overlap

T-REX-style platforms make experiments cheap, which is how you get thousands of concurrent tests interacting in ways no designer intended. The concrete failure mode is not a flipped coin; it is an allocation collision where two teams both claim the homepage hero, or a holdout that was supposed to be globally clean quietly receives a downstream experiment through a shared library. Mid-size teams can steal the boring parts: deterministic bucketing from a stable identifier, an exposure event logged at the moment of decision, and a kill switch that ramps to zero without a deploy.

What they should not steal is unconstrained self-serve on the most valuable surfaces. LinkedIn's culture only works with guardrails: mutually exclusive layers, sample-size calculators that refuse underpowered tests, and a review for experiments that touch money, messaging, or trust. Operational gotcha: metric ramps that look at p-values daily and stop early, locking in noise. Another is assignment in the client and computation in the server using different salts after a refactor, so the user sees variant A and the warehouse scores variant B. Store the assignment with the exposure. Long-running experiments rot: the code path stays, the hypothesis is forgotten, and a later migration treats the losing branch as load-bearing. Give every test an owner and an expiry. Experimentation infrastructure without hygiene becomes a second, unlicensed feature flag system.

## What you can borrow

- Deterministic, hash-based bucketing lets you scale to many concurrent experiments without a centralized assignment service becoming a bottleneck or a single point of failure.
- A shared, vetted metrics library saves far more analyst time than it costs to build, and it keeps different teams' experiment results comparable to each other.
- Bake guardrail metrics into every experiment automatically — don't rely on experimenters to remember to check for regressions outside their own success metric.
- Enforce minimum runtime and sample size before showing "significant" results — cheap statistical hygiene prevents a lot of bad ship decisions.
