---
title: "CompletableFuture Composition Patterns That Actually Work"
slug: "completablefuture-composition-patterns"
description: "CompletableFuture's API surface is huge and easy to misuse. These are the composition patterns that hold up in real asynchronous pipelines."
publishedAt: "2025-03-04"
updatedAt: "2026-09-16"
category: "Java"
tags:
  - Java
  - Concurrency
  - CompletableFuture
  - Async
---

`CompletableFuture` has close to fifty public methods, and most Java developers use maybe six of them correctly. The rest of the API exists to solve real composition problems — chaining dependent async calls, fanning out and joining results, handling failure without blocking — but the wrong method choice quietly reintroduces the blocking behavior you were trying to avoid, or runs your callback on a thread you didn't expect.

## thenApply vs. thenCompose: The Most Common Mistake

`thenApply` transforms a result. `thenCompose` chains an operation that *itself* returns a `CompletableFuture`. Mixing them up produces a future of a future.

```java
CompletableFuture<User> userFuture = fetchUser(userId);

// Wrong: produces CompletableFuture<CompletableFuture<Account>>
CompletableFuture<CompletableFuture<Account>> nested =
    userFuture.thenApply(user -> fetchAccount(user.id()));

// Right: flattens into CompletableFuture<Account>
CompletableFuture<Account> account =
    userFuture.thenCompose(user -> fetchAccount(user.id()));
```

The rule is simple: if the function you're passing already returns `CompletableFuture<T>`, use `thenCompose`. If it returns a plain `T`, use `thenApply`. This is exactly the `map` vs. `flatMap` distinction from `Optional` and `Stream`, and it trips up the same people for the same reason.

## Fan-Out, Then Join

A common real pattern: kick off several independent async calls, then combine their results once all have finished.

```java
CompletableFuture<Inventory> inventory = fetchInventory(sku);
CompletableFuture<Pricing> pricing = fetchPricing(sku);
CompletableFuture<Reviews> reviews = fetchReviews(sku);

CompletableFuture<ProductPage> page = CompletableFuture
    .allOf(inventory, pricing, reviews)
    .thenApply(v -> new ProductPage(inventory.join(), pricing.join(), reviews.join()));
```

`allOf` returns `CompletableFuture<Void>` — it signals completion, not a combined result — so the individual futures still need to be `join()`ed inside the continuation. Calling `join()` here is safe precisely because `allOf` already guaranteed all three finished; it will not block.

## Exception Handling: exceptionally vs. handle

`exceptionally` recovers from a failure but can't see the success path. `handle` sees both outcomes unconditionally and is usually the better default for anything beyond a trivial fallback.

```java
CompletableFuture<Pricing> pricing = fetchPricing(sku)
    .handle((result, error) -> {
        if (error != null) {
            log.warn("Pricing lookup failed for {}", sku, error);
            return Pricing.unavailable();
        }
        return result;
    });
```

Without a `handle`, `exceptionally`, or `whenComplete` somewhere in the chain, an exception thrown deep in a composition simply propagates silently into the resulting future until something calls `.join()` or `.get()` and it surfaces as an unchecked `CompletionException`. If nothing ever calls those, the failure is lost entirely.

## Controlling Which Executor Runs Your Callback

By default, callbacks like `thenApply` run on whichever thread completed the previous stage — which might be the thread that called `complete()`, not a pool thread. The `...Async` variants let you pin execution to a specific executor:

```java
CompletableFuture<Report> report = fetchRawData()
    .thenApplyAsync(this::buildReport, reportingExecutor);
```

| Method | Runs on |
| --- | --- |
| `thenApply` | Whichever thread completes the previous stage |
| `thenApplyAsync(fn)` | Common `ForkJoinPool` |
| `thenApplyAsync(fn, executor)` | The executor you provide |

For anything doing blocking work — a JDBC call, a synchronous HTTP client — always supply an explicit executor. Letting blocking work land on the common pool starves every other `CompletableFuture` and parallel stream in the JVM that shares it.

## A Practical Rule of Thumb

Compose futures declaratively end to end, and call `.get()` or `.join()` exactly once, at the outermost boundary of your code — a controller method, a test, a `main`. Every intermediate `.join()` inside a composition chain is a sign the pipeline should have used `thenCompose` instead.

## A worked example

`thenCompose` to flatten `CompletableFuture<CompletableFuture<T>>`. `thenCombine` for two independent calls. `exceptionally` to a default. `orTimeout` (Java 9+). You pass an executor, not the common ForkJoinPool, for blocking IO. `allOf` then join.

A test uses `completeExceptionally` to prove the fallback.

## Failure modes

`get()` on a request thread. Nested `supplyAsync` without compose. Lost exceptions (`thenAccept` vs `whenComplete`). Blocking inside `thenApply`. Forgetting to cancel. Thread-local not propagating.

`join()` in a stream on hundreds of futures without a bound.

## When this is the wrong tool

A single blocking JDBC call. Structured concurrency on a new JDK. Reactive streams for a firehose. Do not CompletableFuture a CPU loop that should be sequential. If you need a timeout around a legacy API that ignores interrupts, CF will not save you. Virtual threads + sequential code may be clearer.
