---
title: "Sealed Classes and Exhaustive Pattern Matching"
slug: "sealed-classes-exhaustive-pattern-matching"
description: "Sealed classes let the compiler enforce that you've handled every case, turning a class of runtime bugs into compile-time errors."
publishedAt: "2025-02-05"
updatedAt: "2026-09-16"
category: "Java"
tags:
  - Java
  - Sealed Classes
  - Pattern Matching
  - Language Features
---

Before sealed classes, an interface in Java was open to the world — anyone could implement `Shape`, and any `switch` over its implementations needed a `default` branch to satisfy the compiler, whether or not one logically made sense. That `default` was a quiet liability: add a new implementation six months later, forget to update one of the twelve switches handling it, and the new case silently falls into whatever the `default` branch does. Sealed classes, finalized in JDK 17, close that gap.

## Declaring a Closed Hierarchy

A `sealed` type lists exactly which classes or interfaces are allowed to extend or implement it, via `permits`.

```java
public sealed interface Shape permits Circle, Rectangle, Triangle {}

public record Circle(double radius) implements Shape {}
public record Rectangle(double width, double height) implements Shape {}
public record Triangle(double base, double height) implements Shape {}
```

Every permitted subtype must itself be declared `final`, `sealed`, or `non-sealed` — there's no accidentally leaving a gap open. If `Circle`, `Rectangle`, and `Triangle` are all `final` (records are implicitly final), the compiler now knows, with certainty, that those three are the *only* possible shapes that will ever exist.

## Why This Matters for Switch

Pair a sealed hierarchy with a pattern-matching `switch`, and the compiler can verify exhaustiveness without a `default` clause:

```java
static double area(Shape shape) {
    return switch (shape) {
        case Circle c    -> Math.PI * c.radius() * c.radius();
        case Rectangle r -> r.width() * r.height();
        case Triangle t  -> 0.5 * t.base() * t.height();
    };
}
```

Add a fourth shape, say `Trapezoid`, to the `permits` clause, and every `switch` like this one across the codebase fails to compile until you add a matching case. That's the entire value proposition in one sentence: a modeling change becomes a compile error at every call site that needs to know about it, instead of a runtime surprise in whichever one you forgot.

## Sealed Classes vs. Enums

It's tempting to reach for an enum whenever you need a fixed set of alternatives, but enums only work when every variant has the same shape. Sealed hierarchies handle the case where variants carry genuinely different data:

| Need | Enum | Sealed hierarchy |
| --- | --- | --- |
| Fixed set of variants | Yes | Yes |
| Each variant has different fields | No | Yes |
| Each variant needs its own logic | Workaround with abstract methods | Natural fit via pattern matching |
| Singleton instances | Yes | Only if variants are objects, not records |

A `PaymentEvent` with `Authorized(txId, amount)`, `Captured(txId, amount)`, and `Refunded(txId, amount, reason)` can't be an enum — the fields differ per variant — but it's exactly what sealed interfaces plus records were built for.

## Non-Sealed as an Escape Hatch

Sometimes one branch of the hierarchy genuinely needs to stay open to unknown future implementations — a plugin system, for instance. `non-sealed` opts a specific subtype back out of the closed-world guarantee:

```java
public sealed interface Notification permits EmailNotification, PushNotification, PluginNotification {}
public non-sealed interface PluginNotification extends Notification {}
```

Now `switch` statements over `Notification` still need a `default` (or a `case PluginNotification n` catch-all), because the compiler correctly can't prove exhaustiveness anymore. Use this sparingly — every `non-sealed` branch is a place where you've deliberately given up the compiler's help, and it should be a conscious design decision, not a default you reach for because sealing felt restrictive.

## A worked example

`sealed interface Payment permits Card, Cash, Wire`. A switch over `Payment` that does not compile if a new permit is added (with exhaustive switch). Records as permits. You keep the permits in one module so exhaustiveness is a feature.

A test: adding a `Crypto` type fails compilation of the switch — that is the point.

## Failure modes

`default` that hides exhaustiveness. Permits list in another package you always forget. Mixing with non-sealed extension points accidentally. Using sealed for a plugin SPI that third parties must implement (they cannot). Pattern matching on null.

Switch on `String` of the type name instead of the type.

## When this is the wrong tool

Open plugin systems. JPA polymorphic entities with unknown subclasses. If there is only one implementation, skip sealed. Enums may be enough for a closed set of constants without data. Do not sealed a type just to look modern. Visitor pattern on an open hierarchy is the opposite problem.

## A worked failure mode

A sealed interface is in another module and `permits` is forgotten on a new type shipped in a child jar. Exhaustiveness at compile time is a lie; runtime hits `MatchException`. Another design seals DTOs that a JSON mapper cannot instantiate. The failure is seals without a single compilation unit and serialization story. Keep the hierarchy together, add tests that fail on new subtypes, and pick a mapping strategy.

Sealed types are the wrong tool for third-party plugins you cannot list. Do not seal a type you will mock in awkward ways. Use seals when you own all variants and want the compiler to nag you.

A second, quieter failure is operational: the idea is copied from a talk into a path that has no rollback, no owner, and no metric that would show the invariant breaking. For "Sealed Classes and Exhaustive Pattern Matching", that usually means a Friday deploy with production as the first realistic test. Write down the user-visible symptom, the invariant, and the revert before you scale the pattern. If revert is a data rewrite, you do not have a revert—you have a project. Practice the failure in staging with production-sized data at least once, or you will practice it on customers.
