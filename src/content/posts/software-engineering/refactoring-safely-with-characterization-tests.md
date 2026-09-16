---
title: "Refactoring Safely With Characterization Tests"
slug: "refactoring-safely-with-characterization-tests"
description: "Characterization tests pin down what legacy code actually does, bugs included, so you can refactor safely without a real specification."
publishedAt: "2025-11-07"
updatedAt: "2026-09-16"
category: "Software Engineering"
tags:
  - Software Engineering
  - Testing
  - Clean Code
  - Code Quality
---

The standard advice — write tests, then refactor — assumes you know what the code is supposed to do. Legacy code frequently fails that assumption: the original author is gone, the ticket that requested the behavior is five reorgs old, and the only accurate specification left is the running code itself. Characterization tests solve exactly this problem: they capture what the code *actually does*, correct or not, so a refactor can be verified against reality instead of against a spec nobody can produce.

## Capture Behavior, Not Intent

A characterization test doesn't assert what *should* happen — it asserts what *does* happen, recorded directly from the current implementation:

```python
def test_characterize_calculate_discount():
    # Not asserting correctness — recording actual current behavior,
    # including whatever surprises are already baked in.
    assert calculate_discount(order_total=100, coupon="SAVE10") == 90.0
    assert calculate_discount(order_total=100, coupon="EXPIRED") == 100.0
    assert calculate_discount(order_total=0, coupon="SAVE10") == 0.0
    # This one looks wrong — negative discount on a negative total —
    # but it's what production does today, so it's pinned, not fixed.
    assert calculate_discount(order_total=-50, coupon="SAVE10") == -45.0
```

That last assertion is the point of the technique. Fixing the bug and refactoring the code in the same change means a test failure can't tell you which one broke. Pin current behavior first, bugs included, refactor with the pin as a safety net, then fix the bug as a separate, deliberate, reviewable change with its own test asserting the *corrected* behavior.

## Building the Test Suite From the Outside In

For code with no tests and unclear internals, work from the boundary inward: identify every observable input (arguments, environment, external calls) and every observable output (return value, side effects, calls to other systems), then exercise the widest range of realistic inputs you can generate — production log samples, edge cases from bug reports, boundary values — recording what comes out.

```text
1. Find the seams: what goes in, what comes out, what gets called
2. Feed it real (or realistic) inputs across the range you can observe
3. Assert the actual output, not the expected one — you don't know "expected" yet
4. Run against untouched code first; every test should pass by construction
```

Tools that snapshot output automatically (approval testing frameworks, or just asserting against a saved fixture) reduce the tedium of step 3 for code with large or complex outputs — you review and approve the recorded output once, then the suite fails on any deviation from it going forward.

## Refactor Under the Net

With characterization tests green, the refactor itself follows ordinary rules: small steps, run tests after each one, never combine "restructure" and "change behavior" in the same commit. The tests exist to answer one question after every step — did I change what this does, even accidentally — and they answer it without requiring anyone to have first understood the whole system well enough to write a real specification.

## Retire Them Deliberately

Characterization tests are scaffolding, not a permanent test suite — once the refactor lands and the code has a real specification (design doc, well-understood contract, proper unit tests asserting intended behavior), the characterization tests that pinned known bugs should be replaced, not left forever asserting that a bug is a feature. Leaving them in place indefinitely quietly turns "this is what currently happens" into "this is intentional," which is precisely the confusion they were meant to avoid.

## A worked example

Legacy tax function, no tests. You record outputs for 50 production-like inputs (golden files). Refactor internals. Tests still pass. Then you add a few intent-revealing tests. Approval tests for HTML/PDF.

A characterization suite runs in CI on the module you are touching.

## Failure modes

Goldens that include timestamps. Tests so brittle any format change fails. Refactoring and changing behavior in one PR. No coverage of error paths. Generating goldens from a buggy run and locking the bug in.

Throwing away goldens because they are "ugly."

## When this is the wrong tool

New code should have intent tests first. Characterization will not tell you the spec is wrong. Do not use it to freeze a UI you want to redesign. If you can extract a pure function and specify it, do that. Snapshot tests of entire pages are a cousin — use with care. Skip if the code is 20 lines and you can read it.

## A worked failure mode

Characterization tests snapshot a bug; the refactor preserves the bug and is called success. Coverage is of getters, not of the money path. The failure is characterizing without later tightening. Pin behavior, refactor, then replace pins with real specs as you learn.

Characterization tests are the wrong tool for greenfield. Do not freeze garbage forever. Use them to get a foothold on untested legacy, then improve the spec.

The wrong-tool test is easier with a concrete customer. If a user can lose money, lose access, or see someone else's data when "Refactoring Safely With Characterization Tests" is slightly misapplied, do not let the pattern ride on defaults. Tighten the API, add an assertion in CI, and refuse silent fallbacks that look like success. Most production failures here are not exotic; they are a missing bound, a missing key, or a missing check that the original paper assumed a careful operator would have.

Copy-paste from an internal success is still a failure mode. The last team had different traffic, a different datastore, and six months of scars. "Refactoring Safely With Characterization Tests" should be adopted with the scars attached: the dashboard they wished they had, the migration they feared, the incident that made the rule. If those artifacts are missing, you are adopting a slide. Spend a day interviewing the last on-call before you spend a quarter implementing their diagram.
