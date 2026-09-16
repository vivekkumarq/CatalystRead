---
title: "Java Structured Concurrency: Threads as a Tree, Not a Bag of Futures"
slug: "java-structured-concurrency-explained"
description: "What structured concurrency adds on top of virtual threads: scopes, cancellation that actually propagates, and how it compares to CompletableFuture spaghetti."
publishedAt: "2026-09-01"
category: "Java"
tags:
  - Java
  - Concurrency
  - Virtual Threads
  - Project Loom
sources:
  - title: "JEP 505: Structured Concurrency (Fifth Preview)"
    publisher: "OpenJDK"
    url: "https://openjdk.org/jeps/505"
  - title: "Structured Concurrency"
    author: "Martin Sústrik / Nathaniel J. Smith lineage, adopted in JDK"
    publisher: "OpenJDK documentation"
    url: "https://openjdk.org/jeps/428"
---

`CompletableFuture` made composition possible and ownership optional. You can `supplyAsync` a task, lose the handle, and still have work running after the HTTP request that spawned it is dead. Structured concurrency (the family of JEPs around 428/499/505) takes the opposite default: concurrent tasks are children of a **scope**. When the scope exits, children are joined or cancelled. Failures in a sibling can shut the rest down. It is the same instinct as a `try` block, applied to threads.

Virtual threads made blocking cheap enough that "just spawn a thread per task" is reasonable again. Structured concurrency is how you keep that from becoming an unbounded thread leak with no cancellation story.

## A scope is a lifetime

```java
try (var scope = StructuredTaskScope.open()) {
    var user = scope.fork(() -> userClient.fetch(id));
    var orders = scope.fork(() -> orderClient.list(id));
    scope.join();
    return new Page(user.get(), orders.get());
}
```

If `fetch` throws, policies can cancel `list` instead of leaving it to hammer a downstream. If the caller thread is interrupted, the scope can interrupt children. Compare that to two independent futures and a `allOf` that you forget to `cancel(true)` in a `finally`.

Shutdown policies matter: wait for all, race for the first success, cancel on first failure. Pick one per use case. A "first non-empty search result" is a race. A "debit and emit receipt" is not.

## What it does not do

It does not replace reactive streams for millions of in-flight events. It does not magically timeout; you still combine with `joinUntil` / deadline APIs as they stabilize in the JDK you actually run. It does not fix thread-locals that leak across virtual threads — use scoped values (the companion JEP) when you need request context.

Preview APIs move. Pin your language level and read the JEP for the JDK you ship, not a blog from two previews ago. The design center has been stable: treat threads like stack frames that can run in parallel, with the same discipline you already use for sockets in try-with-resources.

If a code review shows `new Thread` or a fire-and-forget executor submit inside a request path, ask where cancellation lives. If the answer is "we hope it finishes," that is the bug structured concurrency is for.
