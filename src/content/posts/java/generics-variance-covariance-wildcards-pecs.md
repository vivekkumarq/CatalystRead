---
title: "Generics Variance: Covariance, Wildcards, and PECS"
slug: "generics-variance-covariance-wildcards-pecs"
description: "Wildcard generics confuse most developers on sight, but the PECS rule turns a wall of question marks into a mechanical, memorable decision."
publishedAt: "2025-08-25"
updatedAt: "2026-09-16"
category: "Java"
tags:
  - Java
  - Generics
  - Wildcards
  - API Design
---

`List<? extends Number>` and `List<? super Number>` look nearly identical and mean almost opposite things, which is why wildcard generics have a reputation for being the part of Java's type system developers memorize a rule for rather than truly reason about. The rule — PECS, "Producer Extends, Consumer Super" — is genuinely mechanical once the underlying problem is clear, and it's worth understanding the problem before the mnemonic.

## Why List<Integer> Isn't a List<Number>

The instinct that `List<Integer>` should be usable wherever `List<Number>` is expected feels obviously safe — every `Integer` is a `Number`. But Java generics are deliberately *invariant* by default: `List<Integer>` is not a subtype of `List<Number>`, and the reason is mutation.

```java
List<Integer> ints = new ArrayList<>();
List<Number> numbers = ints; // if this compiled...
numbers.add(3.14);           // ...this would silently corrupt a List<Integer>
```

If that assignment were legal, the second line would insert a `Double` into what's actually backed by a `List<Integer>`, and the corruption wouldn't surface until something later tries to read an `Integer` back out and gets a `ClassCastException` at a completely unrelated line of code. Invariance closes this hole entirely, at the cost of flexibility that wildcards exist to restore, safely, in the specific cases where it's actually safe.

## Producer Extends: Reading Safely

`? extends T` means "some unknown subtype of T" — you can safely *read* a `T` out of it (every element genuinely is at least a `T`), but you cannot safely *add* to it, because the compiler doesn't know the concrete type and any object you'd add might not match it.

```java
static double sum(List<? extends Number> numbers) {
    double total = 0;
    for (Number n : numbers) {  // reading is safe — every element is at least a Number
        total += n.doubleValue();
    }
    return total;
    // numbers.add(5); would not compile — the list might actually be a List<Integer>
}

sum(List.of(1, 2, 3));       // List<Integer> accepted
sum(List.of(1.5, 2.5));      // List<Double> accepted too
```

## Consumer Super: Writing Safely

`? super T` means "some unknown supertype of T" — the reverse trade-off. You can safely *add* a `T` (any supertype's list can legally hold a `T`), but reading gives you only `Object`, since the compiler doesn't know how far up the hierarchy the actual type sits.

```java
static void addNumbers(List<? super Integer> list) {
    list.add(1);      // safe — an Integer fits in any supertype-of-Integer list
    list.add(2);
    // Number n = list.get(0); would not compile — could only be read as Object
}

List<Number> numbers = new ArrayList<>();
addNumbers(numbers);   // List<Number> accepted, since Number is a supertype of Integer
```

## PECS as a Mechanical Rule

| You're writing a method that... | Use | Mnemonic |
| --- | --- | --- |
| Only reads elements out of the collection | `? extends T` | Producer Extends |
| Only writes elements into the collection | `? super T` | Consumer Super |
| Both reads and writes | Exact type `T`, no wildcard | Neither applies |

`Collections.copy` is the textbook example that needs both roles at once, and its signature spells out PECS directly:

```java
public static <T> void copy(List<? super T> dest, List<? extends T> src)
```

`src` only ever gets read from — it's a producer of `T`, so `extends`. `dest` only ever gets written to — it's a consumer of `T`, so `super`. Once you're naming parameters by the role they play (does this argument hand data *out*, or take data *in*?) rather than trying to reason about subtyping directly, PECS stops being a mnemonic you look up and becomes the obvious shape of the method signature.

## A worked example

PECS: `copy(List<? extends T> src, List<? super T> dst)`. You cannot add to `List<? extends Animal>` except `null`. Arrays are covariant and broken; prefer lists. A helper `Consumer<? super T>` for listeners.

A compile error when you `add` a `Dog` to `List<? extends Animal>` is the lesson.

## Failure modes

Raw types. `List<List<?>>` confusion. Arrays of parameterized types. `Class<T>` vs wildcards. Heap pollution with varargs. Forcing `T` where a wildcard would allow reuse.

`@SuppressWarnings("unchecked")` as architecture.

## When this is the wrong tool

If all types are the same concrete class, skip wildcards. Reflection-heavy code will fight generics. Do not PECS a public API into unreadability for one call site. Kotlin declaration-site variance is not Java — do not copy the syntax. If you need heterogeneous trees, visitors or sealed types may be clearer than `?`.

## A worked failure mode

An API is `List<Animal>` and callers cannot pass `List<Dog>`. Someone uses raw `List` to silence the compiler and heap pollution follows. `List<? extends T>` is used in a setter that needs to add. The failure is PECS ignored and raw types as an escape. Producer extends, consumer super, and no raw types in new code.

Variance gymnastics are the wrong tool if a precise type or a copy would do. Do not wildcard every parameter. Use PECS at API boundaries where it removes casts; keep internals simple.

Copy-paste from an internal success is still a failure mode. The last team had different traffic, a different datastore, and six months of scars. "Generics Variance: Covariance, Wildcards, and PECS" should be adopted with the scars attached: the dashboard they wished they had, the migration they feared, the incident that made the rule. If those artifacts are missing, you are adopting a slide. Spend a day interviewing the last on-call before you spend a quarter implementing their diagram.
