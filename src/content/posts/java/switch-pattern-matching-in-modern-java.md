---
title: "Switch Pattern Matching in Modern Java"
slug: "switch-pattern-matching-in-modern-java"
description: "Switch expressions with pattern matching turn instanceof chains and type-casting boilerplate into concise, exhaustive, compiler-checked logic."
publishedAt: "2025-05-27"
updatedAt: "2026-09-16"
category: "Java"
tags:
  - Java
  - Pattern Matching
  - Switch
  - Language Features
---

Java's `switch` spent two decades limited to primitives, enums, and strings, with fall-through as the default and a `break` you had to remember on every branch. Pattern matching for switch, finalized in JDK 21, is close to a different language feature wearing the same keyword — it can match on type, destructure records, and guard with arbitrary conditions, all while the compiler checks you've covered every case.

## From instanceof Chains to Type Patterns

The pre-pattern-matching way of branching on type looked like this:

```java
static double perimeter(Object shape) {
    if (shape instanceof Circle) {
        Circle c = (Circle) shape;
        return 2 * Math.PI * c.radius();
    } else if (shape instanceof Rectangle) {
        Rectangle r = (Rectangle) shape;
        return 2 * (r.width() + r.height());
    } else {
        throw new IllegalArgumentException("Unknown shape");
    }
}
```

Every branch repeats the same three steps: check the type, cast, extract fields. Pattern matching for switch collapses all of it:

```java
static double perimeter(Object shape) {
    return switch (shape) {
        case Circle c    -> 2 * Math.PI * c.radius();
        case Rectangle r -> 2 * (r.width() + r.height());
        default -> throw new IllegalArgumentException("Unknown shape");
    };
}
```

No explicit cast is needed — `c` and `r` are already typed correctly inside their branches, and the compiler enforces it. Combined with a sealed hierarchy for `shape`'s type, the `default` branch can be dropped entirely, and the compiler will verify exhaustiveness for you at compile time.

## Record Patterns: Destructuring, Not Just Matching

Record patterns, also from JDK 21, let a `case` reach directly into a record's components instead of matching the whole record and then calling accessors separately.

```java
sealed interface Shipment permits Domestic, International {}
record Domestic(String city, String zip) implements Shipment {}
record International(String country, String customsCode) implements Shipment {}

static String label(Shipment shipment) {
    return switch (shipment) {
        case Domestic(String city, String zip) -> city + ", " + zip;
        case International(String country, String code) when code.isBlank() ->
            "International: " + country + " (customs pending)";
        case International(String country, String code) ->
            country + " [" + code + "]";
    };
}
```

Patterns can nest arbitrarily deep — a record containing another record can be destructured in one `case` line — which is especially useful when matching over parsed data or event payloads with several levels of structure.

## Guards With `when`

The `when` clause attaches an arbitrary boolean condition to a case, evaluated only after the pattern itself matches. This replaces what used to require a nested `if` inside the branch body, and it participates in exhaustiveness checking — the compiler knows a guarded pattern might not match, so it won't let a guarded case stand in for full coverage of that type on its own.

```java
static String classify(Object value) {
    return switch (value) {
        case Integer i when i < 0 -> "negative int";
        case Integer i when i == 0 -> "zero";
        case Integer i -> "positive int";
        case String s when s.isEmpty() -> "empty string";
        case String s -> "string: " + s;
        default -> "other";
    };
}
```

## null Handling Is Explicit Now

Traditional `switch` throws `NullPointerException` if the selector is `null`. Pattern-matching switch lets you handle it as an explicit case instead of forcing a null check beforehand:

```java
static String describe(Object value) {
    return switch (value) {
        case null -> "nothing here";
        case Integer i -> "int: " + i;
        default -> "something else";
    };
}
```

| Old style | New style |
| --- | --- |
| `instanceof` + manual cast | Type pattern, no cast needed |
| Nested `if` inside branch | `when` guard on the case |
| Manual accessor calls after cast | Record pattern destructuring |
| Null-check before switch | `case null ->` |

The net effect across all of this is that a `switch` over a sealed type now reads as a complete, checked specification of every shape your data can take — closer to how pattern matching works in languages built around it from the start, without leaving Java's syntax behind.

## A worked failure mode

A switch on a sealed type omits a new subtype because the code was compiled against an older jar; at runtime a match throws. Another switch uses `when` guards with side effects that do not run as expected. Null falls into `default` and is misclassified. The failure is incomplete deployment and guards with effects. Compile against the types you ship, keep cases pure, and handle null explicitly.

## When this is the wrong tool

Pattern switch is the wrong tool for a boolean. Do not replace a visitor on a huge hierarchy overnight without tests. Use it when the type algebra is sealed and the compiler can prove exhaustiveness.

Treat the counterexample as part of the spec. Someone will apply "Switch Pattern Matching in Modern Java" to a problem that only looks similar at the noun level—same words, different constraints. Require a one-page fit check: scale, consistency, failure domains, and who is on call. If two of those are guesses, run a spike, not a rewrite. The expensive bugs are not the ones in the happy-path tutorial; they are the ones where the tutorial's silent assumptions were load-bearing.
