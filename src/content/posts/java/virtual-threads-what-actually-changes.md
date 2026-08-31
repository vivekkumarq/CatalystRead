---
title: "Virtual Threads in Java: What Actually Changes"
slug: "virtual-threads-what-actually-changes"
description: "Virtual threads remove the cost of blocking, not the need for careful concurrency design. Here's exactly what improves and what stays your problem."
publishedAt: "2025-01-08"
category: "Java"
tags:
  - Java
  - Virtual Threads
  - Concurrency
  - JVM
---

Virtual threads landed as a standard feature in JDK 21, and the pitch was simple: write blocking, imperative code and get the throughput of async without the callback soup. That pitch is mostly true, but "mostly" is doing a lot of work. Understanding exactly what the JVM changed — and what it deliberately left alone — is the difference between using virtual threads well and shipping a service that mysteriously stalls under load.

## The Problem They Actually Solve

Platform threads are thin wrappers over OS threads. Each one reserves a chunk of stack memory (typically around 1MB) and costs real money to create, schedule, and context-switch. A thread-per-request server built on platform threads tops out somewhere in the low thousands of concurrent connections, not because the CPU is busy, but because most of those threads are parked waiting on a socket read or a database round trip.

Virtual threads decouple the "thread" your code sees from the OS thread that actually runs it. Thousands of virtual threads can be multiplexed onto a small pool of *carrier* platform threads. When a virtual thread blocks on I/O, the JVM unmounts it from its carrier and frees that carrier to run something else. Your code doesn't know any of this happened.

```java
try (var executor = Executors.newVirtualThreadPerTaskExecutor()) {
    List<Future<String>> results = orders.stream()
        .map(order -> executor.submit(() -> fetchInventoryStatus(order)))
        .toList();

    for (Future<String> result : results) {
        System.out.println(result.get()); // blocking, but cheap now
    }
}
```

That `fetchInventoryStatus` call can make a synchronous HTTP request, and it's fine — one virtual thread per order, blocking naturally, no reactive pipeline required.

## What Changes in Practice

- **Thread-per-task is viable again.** You can spin up a virtual thread per request, per row, per outbound call, without exhausting the OS thread table.
- **Blocking I/O stops being expensive.** `Thread.sleep`, `Socket.read`, JDBC calls — all of these now yield the carrier thread instead of parking it.
- **Thread pools for I/O-bound work become pointless.** Pooling exists to amortize thread creation cost and cap concurrency. Virtual threads are cheap to create and near-instant to discard, so you generally create a new one per task instead of reusing one from a pool.

## What Stays Exactly the Same

Virtual threads do not change Java's memory model, they do not make your code thread-safe, and they do not remove the need for locks around shared mutable state. A race condition on a shared counter is still a race condition, whether the two threads racing are platform or virtual.

They also don't add magic parallelism. CPU-bound work still needs actual CPU cores; running a tight numeric loop on ten thousand virtual threads on a four-core box gets you the same throughput as four platform threads, plus scheduling overhead.

## Where Pinning Still Bites

The one sharp edge is **pinning**: a virtual thread that blocks inside a `synchronized` block, or during certain native calls, cannot be unmounted from its carrier. The carrier is stuck waiting too.

```java
synchronized (lock) {
    // A blocking call here pins the carrier thread —
    // no other virtual thread can use it until this returns.
    remoteCache.get(key);
}
```

The fix is usually mechanical: swap `synchronized` for `java.util.concurrent.locks.ReentrantLock` around any block that also does blocking I/O. JDK 24 removed most `synchronized`-related pinning, but if you're on an earlier version, this is the first thing to audit when virtual threads don't deliver the throughput you expected. Run with `-Djdk.tracePinnedThreads=full` during load testing and you'll see exactly where it happens.
