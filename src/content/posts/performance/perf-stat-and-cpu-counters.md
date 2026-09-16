---
title: "perf stat and CPU Counters: What the Hardware Thinks Your Program Did"
slug: "perf-stat-and-cpu-counters"
description: "cycles, instructions, IPC, cache misses, and stalled-cycles: using Linux perf before you rewrite a method the profiler barely saw."
publishedAt: "2026-08-15"
category: "Performance"
tags:
  - Performance
  - Linux
  - Profiling
  - Hardware
sources:
  - title: "perf-stat(1)"
    publisher: "Linux man-pages"
    url: "https://man7.org/linux/man-pages/man1/perf-stat.1.html"
  - title: "Intel 64 and IA-32 Architectures Software Developer's Manual, Volume 3"
    publisher: "Intel"
    url: "https://www.intel.com/content/www/us/en/developer/articles/technical/intel-sdm.html"
---

`perf stat` reads **hardware performance monitoring counters** for a process or a command. It answers whether you are CPU-bound, stalled on memory, or retiring few instructions per cycle **before** you argue about algorithm. A flame graph without counters can send you to optimize a function that is 5% of CPU while the real tax is LLC misses in a serializer you did not look at.

## The first five numbers

**task-clock** versus **wall clock** tells you if you used multiple CPUs. **cycles** and **instructions** give **IPC** (instructions per cycle). Low IPC (well below 1 on a fat OoO core for integer code) often means stalls: cache, branch mispredicts, or dependencies. **cache-misses** and **branches** / **branch-misses** refine that. `perf stat -d` adds L1/LLC.

```bash
perf stat -d -- java -jar app.jar
# or: perf stat -p $PID sleep 30
```

Compare two builds on the **same** machine, same governor, same CPU set. Turbo and SMT make naive comparisons noisy. Pin with `taskset` for microbenchmarks. VMs may virtualize or deny counters (`perf` permission, `kernel.perf_event_paranoid`).

## What counters cannot say

They cannot name a line of Java until you use `perf record` with `--call-graph` and a JIT map (`perf-map-agent`, async-profiler in perf mode). `stat` is aggregate. A 30-second attach during a latency spike is still gold: did IPC drop? did cache-misses jump? That correlates with GC or a noisy neighbor.

Multiplexing: too many events, the PMU rotates, and `stat` estimates. Prefer a small event set. AMD and Intel event names differ; `perf list` is the catalog. Cloud instances sometimes offer limited PMU; then use what you have or a finer profiler.

## A workflow

Reproduce with a load test. `perf stat -p` the PID. If IPC is healthy and task-clock is low, you are waiting (I/O, locks) — not a CPU micro-opt. If LLC misses dominate, look at data layout, allocation, and false sharing. Then record a profile.

Read `man perf-stat` and your vendor's PMU chapter at a high level. Then run `stat` once on the service you were about to "optimize." If cycles are idle, the rewrite was a hobby.
