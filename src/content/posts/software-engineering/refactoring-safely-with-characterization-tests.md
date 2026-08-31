---
title: "Refactoring Safely With Characterization Tests"
slug: "refactoring-safely-with-characterization-tests"
description: "Characterization tests pin down what legacy code actually does, bugs included, so you can refactor safely without a real specification."
publishedAt: "2025-11-07"
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
