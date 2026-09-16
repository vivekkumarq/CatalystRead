---
title: "Practical Tuning Signals for G1 and ZGC"
slug: "practical-g1-zgc-tuning-signals"
description: "Most GC tuning advice is cargo culted flags copied from a blog post. Here's how to read the actual signals before you touch anything."
publishedAt: "2025-03-17"
updatedAt: "2026-09-16"
category: "Java"
tags:
  - Java
  - JVM
  - Garbage Collection
  - Performance
---

The most common GC tuning mistake isn't picking the wrong collector — it's tuning before measuring. Flags copied from a conference talk about a service with a completely different allocation profile than yours will do nothing, or make things worse. Before touching a single `-XX` flag, you need to know what your application's actual allocation and pause behavior looks like, and both G1 and ZGC give you that data if you know where to look.

## Start With GC Logging, Not Flags

Every tuning session should start the same way:

```
-Xlog:gc*:file=gc.log:time,uptime,level,tags
```

This gives you pause durations, cause, and heap occupancy before and after every collection. Before forming an opinion about what's wrong, read a few hundred lines of this log. Two numbers matter more than anything else at first: **pause frequency** and **pause duration**. A service doing sixty young-gen pauses a minute at 5ms each is fine. A service doing four pauses a minute at 400ms each has a real latency problem, even though the total GC time might be similar.

## G1: Reading Allocation Pressure

G1 is region-based and aims for a configurable pause target (`-XX:MaxGCPauseMillis`, default 200ms) rather than a fixed heap layout. When G1 pauses grow long or frequent, the log almost always points to one of these:

- **High allocation rate.** Look at "Eden regions" size and how fast young collections recur. If young GCs fire every second under normal load, your allocation rate is the bottleneck, not the collector — this is an application problem (excessive object churn), not a JVM flag problem.
- **Humongous allocations.** G1 treats any object larger than half a region size as "humongous" and allocates it directly in the old generation, bypassing the young generation entirely. Large byte arrays or oversized collections show up here. `-Xlog:gc+humongous=debug` will confirm it. The fix is usually application-side: stop allocating huge arrays, or increase `-XX:G1HeapRegionSize` so fewer objects cross the humongous threshold.
- **Mixed GC not keeping up.** If old-gen occupancy climbs steadily across mixed collections, G1 isn't reclaiming old regions fast enough relative to promotion rate — often a sign of a genuine memory leak rather than a tuning problem.

```
-XX:+UseG1GC
-XX:MaxGCPauseMillis=150
-XX:InitiatingHeapOccupancyPercent=35
```

Lowering `InitiatingHeapOccupancyPercent` starts concurrent marking earlier, which helps when mixed collections are consistently behind.

## ZGC: When Pause Time Is the Whole Point

ZGC targets sub-millisecond pauses regardless of heap size, by doing almost all of its work concurrently with application threads. If you're reaching for ZGC, it's almost always because G1's pause times, even tuned, aren't good enough for a latency-sensitive service with a large heap.

| Signal | G1 | ZGC |
| --- | --- | --- |
| Typical pause | 10–200ms | Sub-millisecond |
| Heap size sweet spot | Small to medium | Medium to very large |
| CPU overhead | Lower | Higher (more concurrent work) |
| Tuning surface | Large, many flags | Small, mostly self-tuning |

ZGC's main tuning lever isn't a pause-time flag — it's making sure it has enough concurrent GC threads (`-XX:ConcGCThreads`) to keep up with your allocation rate, and enough heap headroom. If ZGC logs show "Allocation Stall" events, the collector is falling behind the application's allocation rate; the fix is more heap or fewer allocations, not a magic flag.

```
-XX:+UseZGC
-XX:+ZGenerational
-Xmx8g
```

`ZGenerational` (default from JDK 21 onward, standardized further in later releases) adds a young generation to ZGC, closing much of the throughput gap it used to have against G1.

## The Rule That Actually Matters

Change one flag at a time, under realistic load, and compare GC logs before and after. Any tuning advice — including everything above — is a starting hypothesis, not a guarantee. The collector that's right for a batch ETL job is often wrong for a request-serving API, even on identical hardware.

## A worked failure mode

Heap is grown to 64GB to hide a leak; G1 pause goals are set to 1ms; CPU burns on concurrent marking while allocation rate is the real issue. ZGC is enabled on a tiny heap where the extra machinery does not pay. Flags are copied from a 2018 blog. The failure is tuning without allocation rate, live set, and pause histograms. Fix leaks and object churn first; then pick a collector that matches pause vs throughput needs.

## When this is the wrong tool

GC flag soup is the wrong tool for a memory leak. Do not switch collectors weekly. Default G1 is fine for many services. Tune when you have GC logs and a stated pause SLO.

A second, quieter failure is operational: the idea is copied from a talk into a path that has no rollback, no owner, and no metric that would show the invariant breaking. For "Practical Tuning Signals for G1 and ZGC", that usually means a Friday deploy with production as the first realistic test. Write down the user-visible symptom, the invariant, and the revert before you scale the pattern. If revert is a data rewrite, you do not have a revert—you have a project. Practice the failure in staging with production-sized data at least once, or you will practice it on customers.
