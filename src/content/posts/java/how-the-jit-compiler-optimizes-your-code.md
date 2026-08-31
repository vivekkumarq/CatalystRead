---
title: "How the JIT Compiler Actually Optimizes Your Code"
slug: "how-the-jit-compiler-optimizes-your-code"
description: "The JVM doesn't run your bytecode as-is for long. Here's what C1, C2, and tiered compilation actually do, and why your benchmarks lie without warmup."
publishedAt: "2025-03-28"
category: "Java"
tags:
  - Java
  - JVM
  - JIT
  - Performance
---

Java code starts life as interpreted bytecode — slow but immediately runnable — and the JVM continuously promotes "hot" methods to native machine code as it learns which parts of your program actually matter. This is why a Java microbenchmark that skips warmup is measuring the interpreter, not your algorithm, and why the same method can run ten times faster after a minute of sustained traffic than it did on the first call.

## Tiered Compilation: Two Compilers, Not One

Modern HotSpot uses two just-in-time compilers with different goals, and by default runs both in sequence.

- **C1 (client compiler)** compiles quickly with light optimization. Its job is to get off the interpreter fast.
- **C2 (server compiler)** compiles slowly but aggressively — inlining, loop unrolling, escape analysis — producing much faster code at a higher compilation cost.

Tiered compilation moves a method through five levels: interpreted, then C1 with light profiling, then progressively more aggressive C1 tiers, and finally C2 once the method has been called enough times and the JVM has gathered enough profiling data to justify the expensive compilation.

```
-XX:+PrintCompilation
```

Running with this flag shows every method as it gets compiled, and at which tier. It's the fastest way to confirm whether your hot path has actually reached C2 or is stuck lower.

## Inlining: The Optimization That Enables Others

Method inlining — replacing a call site with the callee's body — is arguably C2's most important optimization, because it's a prerequisite for many others. A small, frequently-called method (a getter, a comparator, an equals check) gets inlined directly into its caller, eliminating call overhead and exposing more code to further optimization like dead-code elimination.

```java
// This getter is a prime inlining candidate: small, final, called constantly
public final class Point {
    private final int x, y;
    public int x() { return x; }
    public int y() { return y; }
}
```

The JVM has an inlining budget — methods beyond a certain bytecode size (`-XX:MaxInlineSize`, default 35 bytes) generally won't inline unless they're "hot" enough to qualify for a larger threshold. This is one of the practical arguments for small methods: not just readability, but genuine inlining eligibility.

## Escape Analysis and Scalar Replacement

C2 can determine that an object never "escapes" the method it's created in — never gets returned, stored in a field, or passed elsewhere. When that's provable, the JVM can skip heap allocation entirely and keep the object's fields as local variables, sometimes even in CPU registers.

```java
double distance(int x1, int y1, int x2, int y2) {
    Point a = new Point(x1, y1);  // may never actually allocate on the heap
    Point b = new Point(x2, y2);
    return Math.hypot(a.x() - b.x(), a.y() - b.y());
}
```

If `a` and `b` never leave this method, C2 can perform scalar replacement — decomposing the object into its primitive fields and eliminating the allocation, along with the GC pressure it would have caused. This only kicks in once the method is hot enough to be compiled by C2; the interpreter and C1 do not perform escape analysis.

## Deoptimization: When the JVM Changes Its Mind

C2 optimizes aggressively based on assumptions gathered from profiling — for example, that a call site has only ever seen one concrete implementation of an interface, so it can be inlined as if it were final. If that assumption later breaks (a second implementation shows up at runtime), the JVM **deoptimizes**: it discards the compiled code and falls back to the interpreter for that method, then recompiles with updated assumptions.

```
-XX:+PrintCompilation -XX:+UnlockDiagnosticVMOptions -XX:+PrintDeoptimization
```

Frequent deoptimization is a real performance smell — it usually means a call site is polymorphic in a way the JIT can't stabilize around, often from overusing interfaces where a concrete type would do, or from megamorphic call sites in generic frameworks.

## Why This Matters for Benchmarking

Any measurement taken before a method has reached its steady-state compilation tier is measuring the JIT's warmup behavior, not your code's actual performance. This is the entire reason JMH exists as a separate tool rather than "just time it with `System.nanoTime()`" — and it's covered in depth in a dedicated benchmarking article. For now, the takeaway is simpler: never trust a Java performance number from a run shorter than a few seconds of sustained load.
