---
title: "The Java Memory Model: Happens-Before Is the Contract, Not volatile Folklore"
slug: "java-memory-model-happens-before"
description: "JSR-133: what synchronization actually publishes, why double-checked locking needed a rewrite, and how to reason without folklore."
publishedAt: "2026-08-30"
category: "Java"
tags:
  - Java
  - Concurrency
  - JVM
  - Memory Model
sources:
  - title: "JSR-133: Java Memory Model and Thread Specification"
    author: "Jeremy Manson, Bill Pugh, Sarita Adve"
    publisher: "JCP"
    url: "https://www.cs.umd.edu/~pugh/java/memoryModel/jsr133.pdf"
  - title: "Java Language Specification: Memory Model"
    publisher: "Oracle"
    url: "https://docs.oracle.com/javase/specs/jls/se21/html/jls-17.html"
---

The Java Memory Model is the contract between your threads and the JIT. It does not promise that writes become visible "soon." It defines **happens-before**. If action A happens-before action B, then B is guaranteed to observe A's writes (and those of everything that already happened-before A). If two accesses race — no happens-before in either direction — a reader may see a stale value, a default `null`, or an object whose constructor did not look finished. That last case is how double-checked locking became a cautionary tale before JSR-133 and `volatile`.

## Edges you actually get

Program order in a single thread is a happens-before. Unlocking a monitor happens-before a subsequent lock of **that same** monitor. A `volatile` write happens-before subsequent `volatile` reads of that variable. Starting a thread happens-before the first action in that thread; the last action happens-before `join()` returns. `final` fields have a special publication rule at the end of the constructor if you do not leak `this`.

```java
// Safe publication via volatile
class Holder {
  static volatile Config cfg;
  static void init() { cfg = new Config(); } // writes in Config.<init> visible after read of cfg
}
```

A plain `static Config cfg` without `volatile` or a lock: another thread can see `cfg != null` and still see `Config` fields at defaults, because publishing the reference did not happen-before the read.

## volatile is not a mutex

`volatile` provides visibility and, for a single variable, a kind of atomicity for the reference or primitive. It does not make `i++` atomic. It does not compose two fields. `java.util.concurrent` atomics and `VarHandle` give you explicit memory orders (plain, opaque, release/acquire, volatile) when you need less than full volatile cost.

`synchronized` is still the default tool when you update a **set** of fields. The lock is the publication mechanism. Copy-on-write and concurrent collections document their own happens-before (e.g. a successful `ConcurrentHashMap.put` happens-before a later `get` that sees it).

## How to debug without myths

"I added `Thread.sleep` and it works" is not a memory-model fix. Sleep changes timing, not the relation. Tools: jcstress for litmus tests, and code review for publication: every object shared across threads needs a documented edge — lock, volatile, concurrent data structure, or thread start/join.

Do not use `sun.misc.Unsafe` fences unless you are writing a library and can name the order. Do not assume x86's strong hardware model will save a racy Java program; the JIT can still reorder in ways allowed by the JMM.

Read JLS §17 and the JSR-133 FAQ on final fields. Then look at your singletons, your lazy caches, and your "immutable" objects that leak `this`. Happens-before is not academic. It is why a production JVM is allowed to break programs that were only tested on a quiet laptop.
