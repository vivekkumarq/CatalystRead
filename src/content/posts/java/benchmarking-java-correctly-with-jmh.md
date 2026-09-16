---
title: "Benchmarking Java Correctly with JMH"
slug: "benchmarking-java-correctly-with-jmh"
description: "A System.nanoTime() loop around your code is not a benchmark — it's a measurement of the JIT compiler warming up. JMH exists to fix exactly that."
publishedAt: "2025-09-07"
updatedAt: "2026-09-16"
category: "Java"
tags:
  - Java
  - JMH
  - Benchmarking
  - Performance
---

Every Java developer has, at some point, written a benchmark that looked like this: wrap the code in a loop, call `System.nanoTime()` before and after, print the difference. It's also, almost every time, wrong — not because the arithmetic is wrong, but because it ignores JIT warmup, dead code elimination, and constant folding, three JVM behaviors that can each independently make the result meaningless. JMH (Java Microbenchmark Harness), built by the same team that builds the JIT compiler, exists specifically to control for all three.

## Why Hand-Rolled Benchmarks Lie

```java
// Don't do this
long start = System.nanoTime();
for (int i = 0; i < 1_000_000; i++) {
    doWork(i);
}
long elapsed = System.nanoTime() - start;
```

Three separate problems hide in this loop. First, the early iterations run interpreted or under light C1 compilation — the method hasn't been called enough times yet to reach C2 — so the measurement blends cold and warm performance together. Second, if the result of `doWork` is never used, the JIT is legally allowed to eliminate the call entirely as dead code, and you'd measure an empty loop without any indication that happened. Third, if the input `i` is effectively constant-foldable, the JIT may precompute results at compile time, again measuring nothing real.

## What JMH Does Differently

JMH generates a separate benchmark harness class per method, runs explicit warmup iterations before measurement begins, and forces you to consume results in a way that defeats dead-code elimination.

```java
@BenchmarkMode(Mode.AverageTime)
@OutputTimeUnit(TimeUnit.NANOSECONDS)
@State(Scope.Thread)
@Warmup(iterations = 5, time = 1)
@Measurement(iterations = 5, time = 1)
@Fork(2)
public class HashingBenchmark {

    private final String input = "order-42-status-update";

    @Benchmark
    public int sha256Hash() {
        return DigestUtils.sha256Hex(input).hashCode();
    }
}
```

- `@Warmup` runs the method repeatedly before measurement starts, letting C2 compile it — this alone fixes the biggest source of hand-rolled benchmark error.
- `@Fork(2)` runs the whole benchmark in two separate JVM processes and averages the results, which controls for JIT decisions and GC state that happened to differ from one JVM instance to the next.
- Returning the result (rather than discarding it) gives JMH's *blackhole* mechanism something to consume, which prevents the JIT from eliminating the computation as unused.

## Avoiding Dead Code Elimination Explicitly

When a benchmark method doesn't naturally return a value worth consuming, inject a `Blackhole` directly and hand it the result:

```java
@Benchmark
public void processOrder(Blackhole blackhole) {
    Order result = orderProcessor.process(sampleOrder);
    blackhole.consume(result);
}
```

This tells the JIT the computation has an observable side effect, which stops it from being optimized away — and it does so without the awkwardness of a benchmark that returns a value purely to trick the compiler.

## Comparing Alternatives Fairly

JMH's real value shows up when comparing two implementations of the same operation — exactly the situation where a naive benchmark's warmup bias is most likely to produce a backwards conclusion.

| Benchmark | Mode | Score |
| --- | --- | --- |
| `hashMapLookup` | AverageTime | 12.4 ns/op |
| `treeMapLookup` | AverageTime | 41.7 ns/op |
| `arrayLinearScan` (n=10) | AverageTime | 8.9 ns/op |

A result like this — a linear scan beating both map implementations for a ten-element collection — is exactly the kind of counterintuitive, size-dependent result that only a properly warmed-up, statistically sound benchmark reveals reliably. Guessing from first principles ("maps are always faster than linear scans") would have missed it entirely.

## The Practical Rule

Never trust a Java performance claim — including ones in blog posts, including this one's numbers above as illustrative rather than measured — that doesn't specify warmup iterations, fork count, and JVM version. If you're making a real decision based on a benchmark, run it yourself with JMH on your actual target JVM and hardware; JIT behavior, memory layout, and even CPU cache effects can meaningfully shift results between environments that look similar on paper.

## A worked failure mode

A microbenchmark times `new ArrayList` in a loop with the JIT compiling away the work because results are never used. It "proves" allocation is free. A second benchmark shares a mutable list across threads and measures a race. JMH without `Blackhole`, without warmup, and without stating the GC and CPU affinity is a blog comment, not a measurement. Run with forks, read the allocation profiler, and compare against a profiler on the real service.

## When this is the wrong tool

JMH is the wrong tool to find why a web request is slow; use a production profiler. It is the wrong tool for a 3-line method you will not ship. Do not optimize a nanosecond path that is 0.01% of CPU. Use JMH when you have a hot, isolatable kernel and you will not let the JIT delete it.

Treat the counterexample as part of the spec. Someone will apply "Benchmarking Java Correctly with JMH" to a problem that only looks similar at the noun level—same words, different constraints. Require a one-page fit check: scale, consistency, failure domains, and who is on call. If two of those are guesses, run a spike, not a rewrite. The expensive bugs are not the ones in the happy-path tutorial; they are the ones where the tutorial's silent assumptions were load-bearing.
