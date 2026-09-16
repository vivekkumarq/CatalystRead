---
title: "Profiling Java Apps with async-profiler and JFR"
slug: "profiling-java-apps-async-profiler-and-jfr"
description: "Guessing at performance problems wastes time twice: once guessing, once confirming the guess was wrong. Here's how to actually see what the JVM is doing."
publishedAt: "2025-07-04"
updatedAt: "2026-09-16"
category: "Java"
tags:
  - Java
  - Profiling
  - JFR
  - Performance
---

The fastest way to waste an afternoon on a performance problem is to guess which method is slow, optimize it, and discover throughput didn't move because the actual bottleneck was somewhere else entirely. Java has had genuinely low-overhead profiling tools for years — Java Flight Recorder and async-profiler — and the only real barrier to using them is not knowing which one answers which question.

## JFR: Always-On, Low Overhead

Java Flight Recorder ships in every modern JDK and is designed to run continuously in production with overhead low enough to leave on permanently — typically well under 2%. It records a structured stream of events: GC pauses, allocation samples, thread states, lock contention, and (with the right settings) method-level execution samples.

```
java -XX:+FlightRecorder \
     -XX:StartFlightRecording=duration=60s,filename=recording.jfr \
     -jar app.jar
```

You can also start and stop a recording against a running process without a restart, using `jcmd`:

```
jcmd <pid> JFR.start duration=120s filename=recording.jfr
```

The resulting `.jfr` file opens in JDK Mission Control, which turns raw events into flame graphs, allocation hot spots, and GC timelines. Because JFR is always sampling at low overhead, it's the right first move for "something got slower in production and I don't know why" — you don't need to reproduce the issue locally, you just need a recording from the window it happened in.

## async-profiler: Deeper, On-Demand

async-profiler is a separate, open-source tool that samples using OS-level signals (`perf_events` on Linux) rather than JVM-internal safepoint sampling, which avoids **safepoint bias** — a real problem with older profiling tools, where samples were only taken at JVM safepoints, systematically over-representing code paths near safepoint checks and under-representing tight loops that don't hit one.

```
./profiler.sh -d 30 -f flamegraph.html <pid>
```

That command samples the running process for 30 seconds and produces an interactive flame graph directly. async-profiler can also sample allocations specifically, which is the fastest way to find exactly which call site is generating the most garbage:

```
./profiler.sh -e alloc -d 30 -f alloc-flamegraph.html <pid>
```

## Reading a Flame Graph

A flame graph's x-axis is *not* time — it's sorted alphabetically or by sample count, and width represents the proportion of total samples where that frame was on the stack. The y-axis is stack depth, root at the bottom. The practical reading strategy:

1. Find the widest frames near the top of a stack (deepest, most specific) — these are where time is actually being spent, not just passed through.
2. A wide frame low in the stack with a narrow child means time is spent in that frame's own code, not in what it calls.
3. Many separate narrow towers with the same top frame usually means one hot method is called from many call sites — worth caching or optimizing centrally rather than at each call site.

## Which Tool for Which Question

| Question | Tool |
| --- | --- |
| "What changed in production last hour?" | JFR, continuous recording |
| "Which method burns the most CPU right now?" | async-profiler, CPU mode |
| "What's generating all this garbage?" | async-profiler, `-e alloc` mode |
| "Are threads blocked on locks?" | JFR lock contention events, or async-profiler lock mode |
| "What does GC pause behavior look like over a day?" | JFR, long recording, Mission Control GC view |

## A Habit Worth Building

Attach a profiler before forming a hypothesis, not after. It's tempting to read a stack trace or a slow endpoint and jump straight to "it's probably the JSON serialization" — sometimes that's right, and sometimes the actual cost is a connection pool starving under load while the serialization code sits idle waiting for a connection. A 30-second flame graph settles the question directly instead of burning an afternoon optimizing the wrong thing.

## A worked failure mode

A CPU profile is taken for 2 seconds during GC and they rewrite a random method. Allocation profiling is off; the problem is young-gen churn. Async-profiler without `-XX:+UnlockDiagnosticVMOptions` stories on an unsupported JDK version silently samples poorly. The failure is short, biased profiles. Capture under load, include allocations and locks, and change only what the flame graph names.

## When this is the wrong tool

Profiling is the wrong tool to guess a missing index in the database—check SQL first. Do not run high-overhead method tracing in prod all week. Profile when you have a symptom and a representative load.

Copy-paste from an internal success is still a failure mode. The last team had different traffic, a different datastore, and six months of scars. "Profiling Java Apps with async-profiler and JFR" should be adopted with the scars attached: the dashboard they wished they had, the migration they feared, the incident that made the rule. If those artifacts are missing, you are adopting a slide. Spend a day interviewing the last on-call before you spend a quarter implementing their diagram.
