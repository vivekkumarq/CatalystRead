---
title: "Escape Analysis: When the JVM Allocates Your Objects on the Stack (or Not at All)"
slug: "java-escape-analysis-allocation-elimination"
description: "How HotSpot decides an object never leaves a method, what scalar replacement actually removes, and how to read JFR when allocation still spikes."
publishedAt: "2026-09-03"
category: "Java"
tags:
  - Java
  - JVM
  - Performance
  - JIT
---

Java looks like it allocates everything on the heap. HotSpot's escape analysis can prove that a new object never becomes reachable from another thread or from the heap after the method returns. Then the JIT may **scalar-replace** it: explode the object into fields in registers or on the stack, and skip the heap allocation entirely. That is why a tight loop that "news" a Point every iteration is not automatically a GC disaster — and why a single innocent `toString` that stores the Point in a list destroys the optimization.

## Escape states, informally

- **No escape:** only the allocating method uses the object. Candidate for scalar replacement.
- **Arg escape:** passed to a callee the compiler cannot see through. Often still allocatable on the stack in simpler schemes, but HotSpot is conservative.
- **Global escape:** stored in a static, a heap field, or published to another thread. Heap it is.

```java
static int manhattan(int x, int y) {
    Point p = new Point(x, y); // often eliminated
    return Math.abs(p.x) + Math.abs(p.y);
}

static Point leak(int x, int y) {
    Point p = new Point(x, y);
    CACHE.add(p); // global escape — allocation stays
    return p;
}
```

Synchronization on a non-escaping object can be elided too (lock elision). That is a separate, related trick: if no other thread can see the object, the monitor is theater.

## Why production still allocates

Reflection, `Object[]` varargs, and storing into an array that the compiler treats as escaping will keep the allocation. Iterator objects from enhanced-for over a custom collection often escape. Autoboxing is a classic: `map.get` returning `Integer` allocates when the JIT cannot prove otherwise.

JFR / allocation profiling tells the truth. If `Point` still dominates TLAB allocations in a loop you thought was scalar-replaced, look at the bytecode the JIT saw — logging, an interface call the compiler will not inline, or a debug `System.out` you left in. `-XX:+PrintEscapeAnalysis` is a diagnostic, not a production flag.

## Writing code the JIT can actually optimize

Keep hot objects short-lived and unescaped. Prefer primitives in hot loops. Do not "micro-optimize" by reusing a mutable buffer across threads without measurement; you may lose more to contention than you gain versus a young-gen bump. Escape analysis is a reason the boring style — local variables, small methods the JIT inlines — is often faster than a clever object pool.

When someone claims "Java always GCs my DTOs," ask for an allocation profile from the JIT-warmed process, not from `-Xint`. Interpreted mode allocates everything. The compiler is the other half of the language.
