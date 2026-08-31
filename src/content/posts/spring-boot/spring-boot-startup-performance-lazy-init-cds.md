---
title: "Spring Boot Startup Performance: Lazy Init, CDS, and What Actually Helps"
slug: "spring-boot-startup-performance-lazy-init-cds"
description: "A measured look at which Spring Boot startup optimizations move the needle in practice, from lazy initialization to Class Data Sharing and beyond."
publishedAt: "2026-01-12"
category: "Spring Boot"
tags:
  - Spring Boot
  - Performance
  - Java
  - DevOps
---

Startup time didn't matter much when Spring Boot apps ran as long-lived processes on a handful of dedicated servers. It matters a lot more now, with autoscaling replacing instances constantly and CI pipelines spinning up the application repeatedly for integration tests. The good news is there are real, measurable wins available without going all the way to a native image; the trap is applying an optimization that sounds right without confirming it actually helped your specific application.

## Measure Before You Optimize

Spring Boot logs startup time on every boot, split into JVM startup and application context startup — read it before touching anything.

```
Started OrderServiceApplication in 4.812 seconds (process running for 5.103)
```

Actuator's startup endpoint goes further, breaking down the timeline by individual bean initialization step, which is where the actual bottleneck usually lives — often one or two specific beans doing expensive work at startup (a connection pool eagerly warming connections, a cache pre-loading from a slow source), not "Spring is just slow."

```yaml
management:
  endpoint:
    startup:
      access: unrestricted
```

## Lazy Initialization: A Real Win, With a Real Trade-Off

`spring.main.lazy-initialization=true` defers bean creation until first use instead of eagerly creating every bean at startup. For applications with a lot of beans that aren't on the critical path of the first request, this measurably reduces time-to-ready.

```yaml
spring:
  main:
    lazy-initialization: true
```

The trade-off is real: the *first* request to touch a lazily-initialized bean pays its creation cost inline, turning a fast-looking startup into a slow-looking first request — a problem if you measure "time to first response" rather than "time to process start." It also means a misconfigured bean that would normally fail loudly at startup can instead fail on the first real request that needs it, a worse time to discover a configuration error. For latency-sensitive services, pair lazy init with a startup-time warm-up call to the endpoints that matter, so the cost is paid before real traffic arrives.

## Class Data Sharing: Free JVM-Level Speedup

CDS lets the JVM pre-parse and cache class metadata in a shared archive, so subsequent starts skip re-parsing classes from scratch. Since Spring Boot 3.3, application class data sharing is straightforward to generate as part of the build.

```bash
java -Dspring.context.exit=onRefresh -XX:ArchiveClassesAtExit=app.jsa -jar app.jar
```

```bash
java -XX:SharedArchiveFile=app.jsa -jar app.jar
```

Unlike lazy initialization, CDS has essentially no runtime behavioral trade-off — it doesn't change when beans get created, only how fast the JVM gets through class loading to do it. That makes it close to a strictly-better win once the build pipeline generates the archive, and it's worth adopting before reaching for lazy init, which does change behavior.

## What Doesn't Move the Needle, and What Order to Try Things In

A few "optimizations" that show up in startup-tuning advice are worth being skeptical of without measuring your own application:

- **Trimming auto-configuration classes manually** via `@SpringBootApplication(exclude = ...)` rarely saves meaningful time unless you're excluding something genuinely heavy (a full embedded database auto-configuration you don't use, for instance). Most auto-configuration classes are cheap conditional checks, not expensive work.
- **Component scan narrowing** (`@ComponentScan` with a tight base package) helps more on very large codebases with thousands of classes than on a typical service, where scanning itself is a small fraction of total startup time compared to actual bean instantiation.
- **Reducing logging configuration complexity** at startup is negligible compared to database connection pool warm-up or cache pre-loading, which are usually the actual dominant cost once you look at the Actuator startup breakdown.

### A Reasonable Order of Operations

Start with CDS — it's close to free and has no behavioral downside. Check the Actuator startup timeline next and fix whichever specific bean is actually slow, usually a bigger win than any general-purpose flag. Reach for lazy initialization only after that, and only if time-to-first-request still matters for your deployment pattern. Native image is the last step, reserved for workloads where startup time is a hard requirement, not a nice-to-have — the migration cost is real and wasted if CDS plus a fixed slow bean would have gotten you close enough.
