---
title: "The LMAX Disruptor: Mechanical Sympathy for a Trading Journal"
slug: "disruptor-lmax-mechanical-sympathy"
description: "Thompson, Farley, Barker, and co. on the Disruptor: ring buffers, sequence barriers, and avoiding locks when microseconds are the product."
publishedAt: "2026-08-27"
category: "System Design"
tags:
  - System Design
  - Java
  - Concurrency
  - Performance
sources:
  - title: "Disruptor: High performance alternative to bounded queues for exchanging data between concurrent threads"
    author: "Martin Thompson, Dave Farley, Michael Barker, Patricia Gee, Andrew Stewart"
    publisher: "LMAX"
    url: "https://lmax-exchange.github.io/disruptor/disruptor.html"
  - title: "Mechanical Sympathy"
    author: "Martin Thompson"
    publisher: "mechanical-sympathy.blogspot.com"
    url: "https://mechanical-sympathy.blogspot.com/"
---

LMAX built an exchange that needed to journal and process orders in-process at rates where `java.util.concurrent` queues became the bottleneck. The **Disruptor** is a preallocated ring buffer plus a set of rules about who may write which slot. The phrase **mechanical sympathy** (Thompson) means: respect cache lines, the memory model, and the fact that a lock that "only contends sometimes" still blows your p99.

## A ring, not a linked queue

Slots live in a power-of-two array. Producers claim a **sequence**, write the event into `buffer[sequence & mask]`, then publish the sequence. Consumers wait until that sequence is visible, read, and advance their own cursor. There is no per-event allocation in the steady state if you reuse event objects. There is no linked-list pointer chasing.

Waiting strategies range from busy-spin (lowest latency, burns a core) to yielding or blocking. Exchanges spin. Back-office processors block. Copying the spin strategy into a Kubernetes sidecar on a shared node is how you steal neighbors' CPU and still miss SLOs.

```text
producer claims seq 42 → writes slot 42 → publishes 42
consumer gate waits until published ≥ 42 → handles event → advances
```

## Sequence barriers and dependency graphs

Real pipelines are not one producer and one consumer. You may journal to disk, then unmarshall, then apply business logic, then replicate. The Disruptor models this as consumers that cannot pass a **barrier** until earlier consumers (or the producer) have reached a sequence. That is a dataflow graph with cache-friendly storage, not an actor framework.

False sharing is the amateur hour failure. If two sequences sit on one cache line, two cores bounce ownership. The library pads cursors. If you roll your own ring, you will forget padding and then "prove" that Disruptors are not faster than `ArrayBlockingQueue`.

## When this is the wrong shape

If producers and consumers are different machines, you already have a network. Kafka is the log. The Disruptor is for **in-process** handoff with extreme cache locality. If your workers are bursty and you need backpressure into HTTP threads, a blocking queue with a bounded size is easier to reason about. If you allocate on every publish, you threw away the GC thesis.

Single-writer designs are the Disruptor's happy path. Multiple producers need CAS on the cursor and get harder. Many LMAX-style systems make ingress single-threaded on purpose: serialization is cheaper than coordinating writers.

Read the technical paper on the LMAX site for the wait strategies and the graph of consumers. Then profile with a tool that shows cache misses, not just "synchronized is slow." Mechanical sympathy is measurable: LLC misses per event, stall cycles, allocation rate. If those graphs are boring, you may not need a Disruptor. If they are on fire and you are still passing objects through `LinkedBlockingQueue`, you are paying for convenience on the hot path of a matching engine — which is a valid choice only if you say it out loud.
