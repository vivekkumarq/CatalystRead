---
title: "Reading Flame Graphs: From a Wide Plateau to a Line of Code"
slug: "reading-flamegraphs-cpu-and-allocation"
description: "How to interpret width versus height, distinguish on-CPU from off-CPU, and use allocation flames to catch the copy you cannot see in the source."
publishedAt: "2026-09-16"
updatedAt: "2026-09-16"
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

## A worked CPU plateau

A Java service’s p99 jumped after a library bump. A 30-second async-profiler CPU flame shows a wide plateau labeled `com.fasterxml.jackson.databind`. Zoom: most of the width sits in `BeanDeserializer` for a DTO with nested maps, called from a new “enrich every row” filter. The method is not “slow Jackson”; it is “Jackson × N rows × a fatter tree.” The fix is fewer objects or a slimmer JSON, not a faster CPU.

If the same ticket had shown a thin `jackson` tower and a wide `epollWait` / `Unsafe.park`, you would stop reading the CPU flame and capture an off-CPU or JFR wall-clock view of the JDBC call.

## Failure modes of the picture

**Too short a capture.** A 200ms sample during GC or during a one-off admin call is a random comic. Prefer tens of seconds under the load that matches the SLO window.

**Mixed processes.** A host-wide flame without PID/container filters blends sidecars into your app. Filter first.

**Inlined frames missing.** Aggressive inlining folds callees into parents. That is correct cost accounting and a bad map to source. Use a tool that can show inlined children, or accept that the plateau is “this compilation unit.”

**Allocation flame mistaken for CPU.** Bytes are not milliseconds. A huge allocator may still be cheap if the young generation dies in nursery. Use allocation flames to find *who* allocates; use GC and CPU to decide if it *matters*.

**Comparing colors.** Default palettes hash the name. Two red frames are not “hotter.”

## When a flame graph is the wrong first tool

Rare 2-second stalls at 3am want tracing with timestamps, not a 30-second average histogram. Multi-modal workloads (batch + serving in one process) want two captures, not one blended graph. If you cannot reproduce, fix observability (exemplars, logs with trace ids) before staring at a laptop profile of a different shape.

## Review checklist

- Width is the cost metric; height is depth only.
- Capture length and workload match the incident.
- On-CPU vs off-CPU vs allocation is an explicit choice.
- One change, then recapture; unstable graphs mean an unstable experiment.

## A worked failure mode

A CPU flame graph is inverted in the reader's head; they optimize a wide plateau that is GC, not their code. Allocation graphs are ignored while young-gen churn is the latency. A 2-second sample during a GC pause is treated as the steady state. The failure is misreading width vs depth and sampling bias. Confirm with longer profiles and allocation views.

## When this is the wrong tool

Flame graphs are the wrong tool for a distributed wait; you need traces. Do not optimize a 0.3% frame. Use them when on-CPU or allocating hot methods are the hypothesis.

Treat the counterexample as part of the spec. Someone will apply "Reading Flame Graphs: From a Wide Plateau to a Line of Code" to a problem that only looks similar at the noun level—same words, different constraints. Require a one-page fit check: scale, consistency, failure domains, and who is on call. If two of those are guesses, run a spike, not a rewrite. The expensive bugs are not the ones in the happy-path tutorial; they are the ones where the tutorial's silent assumptions were load-bearing.
