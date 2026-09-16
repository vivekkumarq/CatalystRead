---
title: "Scientist: How GitHub Refactors Code It Can't Afford to Break"
slug: "github-scientist-refactoring-critical-paths"
description: "How GitHub built the Scientist library to run new and old code paths side by side in production before ever trusting the new one."
publishedAt: "2025-06-03"
updatedAt: "2026-09-16"
category: "GitHub"
tags:
  - Engineering at Scale
  - GitHub
  - Refactoring
  - Ruby
  - Observability
sources:
  - title: "Scientist: A Ruby library for carefully refactoring critical paths"
    publisher: "GitHub"
    url: "https://github.blog/engineering"
  - title: "scientist"
    publisher: "GitHub Open Source"
    url: "https://github.com"
---

Every large codebase accumulates critical paths that nobody wants to touch: authorization checks, permission calculations, billing logic. The code works, it has been running for years, and it is load-bearing in ways that are not fully documented anywhere. GitHub ran into this problem repeatedly as its permissions system grew more complex, and the usual refactoring playbook — write tests, make the change, ship it, watch for fires — felt too risky when the blast radius was "who can see this private repository."

The team's answer was Scientist, a small Ruby library that lets engineers run a new code path alongside the old one in production, compare the results, and only ever trust the old path's return value while quietly measuring whether the new one agrees.

## The core idea: experiments, not deploys

Scientist wraps a risky change in an "experiment" block with two branches: a `use` block containing the existing, trusted behavior, and a `try` block containing the candidate replacement. Both run on real production traffic and real production data. The control's result is what actually gets returned to the caller, so if the experimental branch is wrong, slow, or throws an exception, users never see it. Scientist swallows the difference, records it, and moves on.

```ruby
require "scientist"

class MyWidget
  def allows?(user)
    experiment = Scientist::Default.new "widget-permissions"
    experiment.use { model.check_user(user).valid? }   # old way
    experiment.try { model.user_allowed?(user) }        # new way
    experiment.run
  end
end
```

Under the hood, Scientist randomizes the order of the two blocks, times each one, catches exceptions independently, and publishes the comparison to whatever instrumentation system the team wires up — usually something that lands in a dashboard engineers can watch over days or weeks.

## Why this mattered at GitHub's scale

Permissions and authorization logic at GitHub touches every request, across millions of repositories with wildly varied combinations of teams, outside collaborators, organization roles, and visibility settings. No test suite realistically covers that combinatorial space. Scientist sidesteps the problem by using production traffic itself as the test suite: instead of guessing which edge cases matter, the experiment surfaces every mismatch that real usage actually produces.

This also changes the psychology of a rewrite. Instead of a single high-stakes cutover — deploy, hold your breath, watch the error rate — the team ships the new code in a disabled, observation-only state and lets confidence accumulate. A migration that might have taken a tense afternoon instead takes a calm couple of weeks, with a dashboard showing the mismatch rate trending toward zero before anyone flips the switch.

## Handling the awkward parts

A few things had to be designed carefully for this to be safe:

- **Side effects.** Running two code paths means running side effects twice, so Scientist is meant for read paths, or the `try` branch needs to be made idempotent/no-op for writes.
- **Performance overhead.** Every experiment costs at least the time of the slower branch. GitHub mitigated this by sampling — running the experiment for only a percentage of requests — and by making it trivial to disable an experiment instantly.
- **Ignoring known noise.** Some mismatches are expected and irrelevant (ordering of an unordered collection, floating-point rounding). Scientist supports `ignore` blocks so teams can filter known-noisy differences without losing sensitivity to real ones.

Scientist was open-sourced and ports appeared in Python, Java, .NET, and other languages, a sign that the underlying problem — "I need to replace code I don't fully trust myself to reason about" — is universal to any team operating at scale.

## What broke when they scaled

GitHub's permission and routing code sits on paths where a mismatch is a security or 404 incident. Unit tests cannot enumerate every repo, every team, every ghost user. Scientist (open-sourced by GitHub) runs old and new implementations on production traffic, compares results, and still returns the old answer until the mismatch rate is understood. At scale the break is comparison cost: you cannot double every request's CPU forever. Sampling, async comparison, and ignoring known-benign diffs (ordering, timestamps) become part of the library's real use.

Mismatches that are "correct new behavior" versus bugs need triage. Without an owner drowning in Scientist alerts, people disable the experiment. Timing also bites: the new path that is slower in the candidate run might be fine once it is the only path, or it might not — you still need load tests.

Scientist does not help if the two paths have different side effects (charges, emails). It is for referentially comparable functions.

## A smaller-team version of the same idea

Wrap a pure function, log both outputs on 1% of traffic, keep serving the old one. Raise when hashes differ. Do this before you switch a billing calculator or an ACL check. Do not Scientist a method that sends email. Graduate to the gem/library when you have several such migrations.

## What you can borrow

- For any change to logic you can't fully unit-test (permissions, pricing, ranking), run old and new implementations side by side in production before cutting over, and only trust the new path's output once mismatches drop to near-zero.
- Keep the control path authoritative during the experiment — the user-facing behavior should never depend on the code you're still validating.
- Sample experiments rather than running them on 100% of traffic if the comparison is expensive; a representative slice is usually enough to build confidence.
- Build in a way to filter expected, harmless mismatches so the signal doesn't drown in noise you already understand.
- Treat a risky refactor as a measurement problem first and a deployment problem second — the deploy becomes trivial once you have days of evidence the two paths agree.
