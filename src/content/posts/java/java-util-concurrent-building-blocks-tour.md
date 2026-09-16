---
title: "A Practical Tour of java.util.concurrent"
slug: "java-util-concurrent-building-blocks-tour"
description: "Beyond synchronized and Thread, java.util.concurrent has a purpose-built tool for nearly every coordination problem. Here's when to reach for each."
publishedAt: "2025-05-15"
updatedAt: "2026-09-16"
category: "Java"
tags:
  - Java
  - Concurrency
  - java.util.concurrent
  - Multithreading
---

A lot of Java concurrency bugs come from developers reaching for `synchronized` and manual `wait`/`notify` when the standard library already has a purpose-built class for exactly the coordination problem at hand. `java.util.concurrent`, added in Java 5 and expanded steadily since, covers most of what application code actually needs: thread-safe collections, atomic primitives, higher-level synchronizers, and executor abstractions. Knowing the package well enough to reach for the right piece by name saves you from reinventing a worse version of it.

## Atomic Variables Instead of Synchronized Counters

For a single shared counter or flag, a full `synchronized` block is usually overkill. `AtomicInteger`, `AtomicLong`, and `AtomicReference` provide lock-free, CAS-based (compare-and-swap) updates.

```java
private final AtomicLong requestCount = new AtomicLong();

public void recordRequest() {
    requestCount.incrementAndGet();
}
```

```java
private final AtomicReference<Config> currentConfig = new AtomicReference<>(Config.defaults());

public void reload(Config newConfig) {
    currentConfig.set(newConfig); // safe, visible publication to all threads
}
```

Under contention, CAS-based updates scale better than locks because there's no thread blocking or OS-level context switch — a losing thread just retries. Under heavy contention on a single atomic, `LongAdder` scales further still, by striping the counter across multiple cells internally and summing them only when you read the total.

## Concurrent Collections

`ConcurrentHashMap` is the default choice for a shared, mutable map accessed by multiple threads — it uses fine-grained internal locking (and lock-free reads) instead of locking the entire map like a `synchronized HashMap` wrapper would.

```java
private final ConcurrentHashMap<String, Session> sessions = new ConcurrentHashMap<>();

public Session getOrCreate(String id) {
    return sessions.computeIfAbsent(id, key -> new Session(key));
}
```

`computeIfAbsent` here is atomic per key — two threads racing to create a session for the same ID will not both succeed; one wins and the other gets the winner's result. That guarantee doesn't hold for the naive `if (!map.containsKey(id)) map.put(id, new Session(id))` pattern, which has a race window between the check and the put.

## Synchronizers for Coordinating Threads

| Class | Use it when |
| --- | --- |
| `CountDownLatch` | One or more threads must wait until N events complete, one-time use |
| `CyclicBarrier` | A fixed group of threads must all reach a point before any proceeds, reusable |
| `Semaphore` | Limiting concurrent access to a resource pool to N permits |
| `ReentrantLock` | Need explicit lock/unlock, tryLock with timeout, or non-block-structured locking |

A `CountDownLatch` is the common one in tests and startup code — waiting for several background initializers to finish before proceeding:

```java
CountDownLatch ready = new CountDownLatch(3);
for (Service service : List.of(cache, database, messageBus)) {
    executor.submit(() -> {
        service.warmUp();
        ready.countDown();
    });
}
ready.await(); // blocks until all three have counted down
```

`Semaphore` is the right tool when the constraint isn't mutual exclusion but a bounded pool — for example, capping concurrent outbound calls to a downstream service that can't handle unlimited parallel load:

```java
private final Semaphore outboundLimit = new Semaphore(20);

public Response call(Request request) throws InterruptedException {
    outboundLimit.acquire();
    try {
        return client.send(request);
    } finally {
        outboundLimit.release();
    }
}
```

## Executors Over Raw Threads

Creating and managing `Thread` objects directly doesn't scale past a handful of ad hoc tasks. `ExecutorService` decouples task submission from thread management, and since JDK 21 includes `Executors.newVirtualThreadPerTaskExecutor()` for I/O-bound workloads alongside the traditional fixed and cached thread pools for CPU-bound work.

The common thread through all of these classes is the same design principle: pick the primitive whose contract matches your actual coordination need, rather than reaching for `synchronized` and hand-rolled state checks as a default. Each of these was built, tested, and hardened against the exact race conditions that hand-written coordination code tends to reintroduce.

## A worked failure mode

A `ConcurrentHashMap` is used with `get`, mutate the value, `put`—lost updates. A `BlockingQueue` with a `cached` thread pool grows to 8,000 threads on a stuck dependency. `wait/notify` is reinvented poorly. The failure is picking a concurrent collection without an atomic update story, and unbounded pools. Use `compute`, bounded executors, and higher-level libraries for pipelines.

## When this is the wrong tool

`java.util.concurrent` is the wrong tool if a single-threaded event loop would do. Do not use `ThreadLocal` as a hidden parameter bus. Skip clever lock-free code until a profiler says so. Use the toolkit's high-level executors and maps with atomic APIs.

When this pattern is stretched past its assumptions, the first outage looks like a mysterious performance cliff instead of a design limit. "A Practical Tour of java.util.concurrent" fails that way when traffic mix, data shape, or team skill does not match the blog that sold the approach. Keep a kill switch: feature flag, smaller blast radius, or an older path that still works. Measure the thing the idea claims to improve, not a vanity graph. If you cannot name a workload where you would refuse to use it, you have not finished the design.
