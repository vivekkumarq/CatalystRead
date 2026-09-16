---
title: "Reading Flame Graphs: From a Wide Plateau to a Line of Code"
slug: "reading-flamegraphs-cpu-and-allocation"
description: "How to interpret width versus height, distinguish on-CPU from off-CPU, and use allocation flames to catch the copy you cannot see in the source."
publishedAt: "2026-09-16"
category: "Performance"
tags:
  - Performance
  - Profiling
  - Observability
  - JVM
sources:
  - title: "Blazing Performance with Flame Graphs"
    author: "Brendan Gregg"
    publisher: "USENIX / brendangregg.com"
    url: "https://www.brendangregg.com/flamegraphs.html"
---

A flame graph is a histogram of stack traces. Width is **how often that frame was on the stack** (or how many bytes were allocated, in an allocation flame). Height is just stack depth — a tall thin tower is not "worse" than a short wide plateau. Brendan Gregg's visualization stuck because you can hunt the plateau with your eyes instead of reading 80,000 samples as text.

## CPU flames

You sampled on-CPU. A wide `jsonParse` frame means the process spent a lot of sampled time there. It does not mean jsonParse is slow in Big-O; it might be called a million times. Click to zoom, search for your package name, ignore kernel frames until you have ruled out user code.

Missing frames (stacks that look too short) often mean you need frame pointers or DWARF, or you profiled a JIT without symbol maps. A Java flame without `-XX:+PreserveFramePointer` / async-profiler setup will lie.

## Off-CPU / wall-clock

If the ticket is "p99 is 2s" and the CPU flame is a sliver of `epoll_wait`, you profiled the wrong thing. Blocking on a database, a lock, or a DNS lookup needs an off-CPU or tracing view (sched traces, JFR wall-clock, eBPF). Using a CPU flame to debug IO wait is a rite of passage you only need once.

## Allocation flames

Width is bytes (or samples of allocations). A constructor that looks cheap in source can dominate if it runs per row. Escape analysis failures show up here: a `Point` you thought was stack-allocated still appears.

Color is usually hash of function name, not heat. Do not invent a temperature legend that is not in the tool.

## A working loop

1. Reproduce with production-like data.
2. Capture 20–30 seconds, not 200ms.
3. Confirm the wide frame is your code or a library you can change.
4. Change one thing, recapture.

If two consecutive flames look unrelated, you do not have a stable workload. Fix the experiment before "optimizing."

Keep Gregg's site as the reference for the visual language. Vendor UIs rename buttons; width-as-cost does not change.
