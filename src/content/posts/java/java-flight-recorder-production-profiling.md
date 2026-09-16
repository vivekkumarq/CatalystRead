---
title: "Java Flight Recorder in Production: Events, Durations, and the Overhead Bargain"
slug: "java-flight-recorder-production-profiling"
description: "Always-on JFR: which event templates belong in prod, how to dump recordings on a stall, and what JFR will not tell you that async-profiler will."
publishedAt: "2026-09-03"
category: "Java"
tags:
  - Java
  - JFR
  - Profiling
  - Observability
sources:
  - title: "Java Flight Recorder"
    publisher: "Oracle JDK documentation"
    url: "https://docs.oracle.com/en/java/javase/21/jfrog/java-flight-recorder.html"
  - title: "JEP 328: Flight Recorder"
    publisher: "OpenJDK"
    url: "https://openjdk.org/jeps/328"
---

Java Flight Recorder is the JDK's **ring-buffer event recorder**. It is built to stay on in production at low overhead when you choose the right event set. Method sampling, allocation samples, GC pauses, lock contention, I/O, and custom `jdk.jfr.Event` subclasses all land in a `.jfr` file you can open in JDK Mission Control or parse with `jfr print`. Guessing which endpoint is slow is optional once you have a 60-second dump from the bad minute.

This is not a duplicate of "how to use async-profiler." async-profiler shines at wall-clock and allocation flame graphs with a simple agent. JFR shines at **correlated events** (GC + allocation + thread park) with a supported, always-on story.

## Templates are the overhead control

`default` versus `profile` is the first fork. Profile enables more method sampling and allocation events; overhead moves from "usually noise" toward "measurable on a tight latency SLO." Start with default in prod, enable profile for a canary or a timed dump. `jcmd <pid> JFR.start name=on name=prod settings=default` plus `JFR.dump` on incident is a runbook. Disk full from unbounded recordings is an own-goal: use maxage/maxsize.

```text
jcmd $PID JFR.dump name=prod filename=/var/tmp/stall.jfr
```

Custom events should be **duration events** around a repository call, not a log line per row. High-frequency custom events will dominate CPU and file size. Thresholds exist so you only record I/O slower than N ms.

## What to look at first in a dump

GC pause events versus application threads parked. Allocation samples pointing at a deserializer. Socket read durations that match a dependency. Class loading in a hot loop (still happens). Virtual thread pinning shows up in more recent JFR event sets — if you are on Loom, use a JDK that records it.

JFR will not always give you a perfect wall-clock flame graph of native code. Mix tools. Do not run three profilers at once on the incident JVM without knowing they share signal (safepoints, signals).

## Safety and privacy

Recordings contain method names, URLs if you put them in events, thread names, and sometimes query-shaped strings. Treat `.jfr` as production data. Do not attach JFR to a public support ticket. Disable events that capture argument values unless you need them.

Read JEP 328 for why this shipped in OpenJDK, then put `JFR.dump` in the incident doc next to thread dumps. A 30-second recording from the stall is worth more than an hour of reproducing on a laptop that does not have production GC settings.
