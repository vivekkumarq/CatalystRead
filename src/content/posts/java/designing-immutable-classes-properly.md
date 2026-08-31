---
title: "Designing Immutable Classes Properly"
slug: "designing-immutable-classes-properly"
description: "Marking fields final is not the same as making a class immutable. Here's what full immutability actually requires and where it usually leaks."
publishedAt: "2025-05-03"
category: "Java"
tags:
  - Java
  - Immutability
  - Design
  - Records
---

`final` fields feel like they should guarantee immutability, and that belief is exactly how mutable state sneaks into classes their authors believed were safe to share across threads without synchronization. Real immutability is a property of the entire object graph reachable from an instance, not a keyword on its fields, and it's worth being precise about what that actually requires.

## The Four Conditions

A class is genuinely immutable only when all of the following hold:

1. All fields are `final`.
2. The class itself is `final`, or its constructors are otherwise not overridable in a way that breaks invariants.
3. No method mutates state after construction — no setters, no in-place `add`/`remove`.
4. Any mutable object referenced by a field is either never exposed, or exposed only as a defensive copy.

Condition 4 is where most "immutable" classes actually fail:

```java
public final class Itinerary {
    private final List<String> stops;

    public Itinerary(List<String> stops) {
        this.stops = stops; // bug: stores the caller's live reference
    }

    public List<String> stops() {
        return stops; // bug: hands out the internal mutable list directly
    }
}
```

```java
List<String> mutable = new ArrayList<>(List.of("NYC", "LON"));
Itinerary trip = new Itinerary(mutable);

mutable.add("TOK");           // mutates the itinerary from outside, unnoticed
trip.stops().add("PARIS");    // mutates it again, through the "immutable" object itself
```

Both bugs come from the same root cause: never having made a copy. The fix is defensive copying at both boundaries — in and out.

```java
public final class Itinerary {
    private final List<String> stops;

    public Itinerary(List<String> stops) {
        this.stops = List.copyOf(stops); // unmodifiable, independent copy
    }

    public List<String> stops() {
        return stops; // already unmodifiable — safe to return directly
    }
}
```

`List.copyOf` both copies and wraps the result in an unmodifiable view, so any attempt to mutate it later — from either direction — throws `UnsupportedOperationException` immediately instead of corrupting state silently.

## Records Don't Automatically Solve This

Records generate accessors that return the field directly, with no defensive copying. A record holding a `List` has exactly the same leak unless you add it yourself, in the compact constructor:

```java
public record Itinerary(List<String> stops) {
    public Itinerary {
        stops = List.copyOf(stops); // now genuinely immutable
    }
}
```

Without that compact constructor, `new Itinerary(mutableList).stops()` returns the same mutable list the caller passed in, and the record's immutability is cosmetic — the fields can't be reassigned, but the object graph underneath one of them still can be mutated freely.

## Why This Is Worth the Effort

| Benefit | Mechanism |
| --- | --- |
| Thread-safe without synchronization | No mutable state means no data race is possible |
| Safe to use as a Map/Set key | Hash code can't change after insertion |
| Safe to cache and share freely | No caller can corrupt a shared instance |
| Simpler reasoning | Object's state is fully known at construction, forever |

The thread-safety benefit alone is usually the strongest argument in a service handling concurrent requests: a genuinely immutable object can be freely shared across threads, cached, and passed around without a single `synchronized` block, because there is no mutable state left for two threads to race over.

## A Practical Default

For value objects — configuration, DTOs, domain value types — default to immutable and require a specific reason to introduce mutability, rather than the other way around. Use `List.copyOf`, `Map.copyOf`, and `Set.copyOf` at construction boundaries as a habit, not an afterthought reached for only after a bug report. The cost is a handful of copy calls; the payoff is an entire category of concurrency and aliasing bugs that simply can't happen.
