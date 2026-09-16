---
title: "jcstress: Concurrency Testing That Treats the JMM as an Adversary"
slug: "jcstress-concurrency-testing"
description: "OpenJDK's jcstress harness: litmus tests, outcome histograms, and how to catch publication bugs that unit tests will never see."
publishedAt: "2026-08-31"
category: "Java"
tags:
  - Java
  - Concurrency
  - Testing
  - JVM
sources:
  - title: "jcstress: Java Concurrency Stress tests"
    publisher: "OpenJDK"
    url: "https://github.com/openjdk/jcstress"
  - title: "Sample jcstress tests in the JDK"
    publisher: "OpenJDK"
    url: "https://github.com/openjdk/jdk/tree/master/test/jdk/org/openjdk/jcstress"
---

JUnit on a quiet laptop will not show you a stale `config` reference. The bug happens when two cores, a JIT, and a thousand iterations line up. **jcstress** (the OpenJDK concurrency stress harness) is built for that: you declare actor methods, a state object, and an arbiter that records which outcomes occurred. The harness runs huge iteration counts, varies compilation, and prints a histogram. Acceptable outcomes are annotated; forbidden ones fail the test.

## A litmus test, not a business test

You are not testing the checkout service. You are testing a **publication protocol**. Typical case: thread 1 writes fields then publishes a reference; thread 2 reads the reference then reads fields. Under the JMM, without a happens-before edge, `(ref != null && field == 0)` can appear. jcstress will try to make it appear.

```java
@JCStressTest
@Outcome(id = "0, 0", expect = ACCEPTABLE, desc = "default")
@Outcome(id = "1, 1", expect = ACCEPTABLE, desc = "ok")
@Outcome(id = "1, 0", expect = FORBIDDEN, desc = "saw ref, missed field")
public class Publish {
  @Actor public void writer(S s) { s.x = 1; s.v = 1; }
  @Actor public void reader(S s, II_Result r) { r.r1 = s.v; r.r2 = s.x; }
}
```

(Your real test uses the jcstress annotations and result classes; the idea is the histogram, not this sketch.)

If you mark `v` volatile, `1, 0` should disappear. That is the whole methodology: **predict outcomes from the JMM, then demand the JVM match**.

## How to run it so the result means something

Use the jcstress fat jar or the Maven plugin. Run on the CPU you care about (AArch64 and x64 reorder differently). Do not run under a tiny `-Xint` only; you want C2 compiled actors. Interpret `INTERESTING` outcomes as "the harness saw something you should classify." Flaky forbidden outcomes are still bugs.

jcstress is a poor fit for "this servlet should return 200." It is a good fit for custom concurrent queues, object pools, lazy init, and any `Unsafe`/`VarHandle` you were dared to write. If you only use `ConcurrentHashMap` and `synchronized`, you may never need it — until you write a cache with a plain `HashMap` and a boolean flag.

## Complementary tools

TLA+ specifies a protocol. jcstress tests the compilation of a Java encoding. JMH measures speed; do not use JMH as a correctness test. Thread sanitizers exist in other ecosystems; on the JVM, jcstress plus code review is the practical pair.

Read the OpenJDK jcstress README and a few tests under `test/jdk`. Then pick one racy class in your repo and write a forbidden outcome. If you cannot name a forbidden outcome, you do not understand the protocol yet, and a unit test will not either.
