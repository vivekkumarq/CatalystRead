---
title: "Backpressure in Streaming Systems"
slug: "backpressure-in-streaming-systems"
description: "Bounded buffers, reactive pull-based demand, and log-based pull consumption: three ways streaming systems handle a slow consumer."
publishedAt: "2025-09-16"
updatedAt: "2026-09-16"
category: "System Design"
tags:
  - System Design
  - Distributed Systems
  - Performance
  - Event-Driven Architecture
---

A streaming pipeline that never applies backpressure is one crash away from happening — a fast producer and a slow consumer, with nothing in between to signal "slow down," ends with an out-of-memory kill or an unbounded queue eating disk. Backpressure is the mechanism that makes a stream's throughput actually equal to its slowest stage, on purpose, instead of by crash.

## Where Pressure Comes From

Every streaming system has at least one stage slower than the one before it eventually — a downstream API rate limit, a database write that gets slower as a table grows, a CPU-bound transform. Backpressure is the propagation of that slowness backward through the pipeline so the fast stages don't keep producing into a void.

```text
[Fast producer] -> [Buffer] -> [Slow consumer]

Without backpressure: buffer grows unbounded -> OOM
With backpressure: producer told to slow down or blocks
```

## Bounded Buffers and Blocking

The simplest form of backpressure is a bounded queue: once full, the producer either blocks (synchronous backpressure) or the system explicitly rejects or drops new items (load shedding).

```python
from queue import Queue

# maxsize turns this into a backpressure mechanism, not just a buffer
work_queue = Queue(maxsize=1000)

def produce(item):
    work_queue.put(item)  # blocks once queue is full — this IS the backpressure

def consume():
    while True:
        item = work_queue.get()
        process(item)
        work_queue.task_done()
```

This is crude but effective for in-process pipelines. It stops being sufficient once producer and consumer are separate services, because "block" now means "hold open a connection" or "the caller's request hangs," which has its own failure modes upstream.

## Reactive Streams and Demand-Based Pull

Frameworks built around reactive streams (Project Reactor, RxJava, Akka Streams) formalize backpressure as the consumer requesting a specific number of items it's ready to process, rather than the producer pushing until told to stop:

```java
Flux.range(1, 1_000_000)
    .onBackpressureBuffer(500)         // bounded buffer, not unbounded
    .publishOn(Schedulers.boundedElastic(), 32)  // consumer pulls in batches of 32
    .subscribe(this::process);
```

The consumer's `request(n)` calls are the actual backpressure signal — the producer literally cannot emit more than the consumer has asked for. This is the correct model when you control both ends of the pipeline in the same process, or over a protocol like gRPC streaming that supports flow control natively.

## When You Don't Control the Producer

Kafka and similar log-based systems sidestep push-based backpressure entirely: consumers pull at their own pace by advancing an offset, and the broker just holds data until retention expires. There's no "slow down" signal to send because nothing is being pushed — a slow consumer simply falls behind, bounded by retention window and disk, not by a producer that needs to be told anything. This is arguably the most robust backpressure model precisely because it requires no coordination; the cost, as with any log-based system, is that falling too far behind means silent data loss past the retention window, not a loud failure.

## Choosing a Failure Mode

Every backpressure strategy is really a choice between three unpleasant options when the system is genuinely overloaded: block the producer (latency spikes upstream, possibly cascading), drop data (load shedding — pick what's least important to lose), or buffer unboundedly (eventual crash, just deferred). There's no strategy that avoids all three — the design work is choosing which one is least bad for your system, deliberately, rather than getting whichever one falls out of default configuration.

## A worked example

A producer writes 10k msgs/s into Kafka; a consumer with a slow DB processes 2k/s. Without backpressure the consumer's in-memory queue grows until OOM. With pause on the poll loop (or a bounded executor plus `pause`/`resume` on the Kafka assignment), lag is visible as consumer lag, not as heap. HTTP: a server returns 429 or stops reading the socket so TCP window closes. Reactive streams `request(n)` is the same idea with a credit window.

A load test shows p99 latency rising smoothly, not a cliff at 30s GC.

## Failure modes

Dropping messages silently. Unbounded `thread pool queue`. Retrying 429 without jitter so you DDoS yourself. Backpressuring the wrong hop (edge waits while the core still ingests). Mixing at-least-once with a full in-memory buffer. Kafka pause that never resumes.

Logging every dropped item at 10k/s — the logger becomes the bottleneck.

## When this is the wrong tool

If the producer is a human form, a 429 plus a message is enough; do not build a reactive pipeline. Backpressure will not fix an under-provisioned database — you still need capacity. For unbounded historical replay, you want storage lag, not TCP backpressure on a live user. Do not backpressure by blocking the event loop of a shared Node process. Batch jobs can run at max disk speed with a bounded thread pool instead of a fancy credit protocol.
