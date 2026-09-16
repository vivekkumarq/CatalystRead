---
title: "GC Pause Tuning Beyond Defaults: Measure First, Then Move the Knobs"
slug: "gc-pause-tuning-beyond-defaults"
description: "G1, ZGC, and the flags that steal latency: pause goals, heap sizing, and the allocation rate that no collector can hide."
publishedAt: "2026-08-22"
category: "Performance"
tags:
  - Performance
  - JVM
  - Garbage Collection
  - Java
sources:
  - title: "HotSpot Virtual Machine Garbage Collection Tuning Guide"
    publisher: "Oracle"
    url: "https://docs.oracle.com/en/java/javase/21/gctuning/"
  - title: "JEP 439: Generational ZGC"
    publisher: "OpenJDK"
    url: "https://openjdk.org/jeps/439"
---

Default G1 on a 512 MB container and default G1 on a 32 GB heap are different machines. **Tuning** starts with logs (`-Xlog:gc*:file=gc.log`) and allocation rate, not with a wiki of `-XX:+Use*` from 2014. If you allocate 2 GB/s, you will collect often. No pause-goal flag deletes that work; it only changes when and where you pay.

## Pause goals are not SLAs

G1's `-XX:MaxGCPauseMillis=200` is a **goal**. G1 sizes young gen to try to meet it. If the young gen becomes tiny, you collect constantly and throughput dies. If the heap is too small, mixed collections and old-gen pressure cause longer pauses anyway. Fix heap size (`-Xms=-Xmx` in containers with care) and live-set first. `-XX:InitiatingHeapOccupancyPercent` affects when concurrent mark starts; set it with occupancy graphs, not folklore.

```text
-Xlog:gc*,gc+ergo*=debug
# allocation rate, pause times, to-space exhaustion, humongous allocations
```

**Humongous** objects (large arrays) in G1 are a classic pause/fragmentation source. Fix the allocation, not only the collector.

## When to change collector

**ZGC** (and generational ZGC) targets very short pauses on large heaps at some throughput/CPU cost and more RAM. **Shenandoah** is a similar story on some distros. **Parallel** GC maximizes throughput for batch. Switching to ZGC because Twitter had a slide is not a plan. Switch because p99 pauses in logs exceed the SLO **and** the live set is large enough that G1 mixed GC cannot meet the goal.

CMS is gone. Do not copy CMS flags. `UseAdaptiveSizePolicy` interactions differ by collector.

## Containers and native

`MaxRAMPercentage` versus a memory limit: leave headroom for metaspace, threads, code cache, and direct buffers. A heap that fills the cgroup OOMs. Direct memory leaks look like GC is "fine" while RSS dies.

Read the GC tuning guide for **your** collector chapter. Then take one GC log from production, compute allocation rate, and only then change a flag. If you cannot explain the last pause from the log, you are not tuning. You are spinning a lottery wheel.
