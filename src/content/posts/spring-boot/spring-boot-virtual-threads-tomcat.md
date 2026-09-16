---
title: "Spring Boot on Virtual Threads: Tomcat, Pinning, and the Pool You Should Delete"
slug: "spring-boot-virtual-threads-tomcat"
description: "spring.threads.virtual.enabled, Tomcat's protocol, synchronized pinning on old JDKs, and when a platform-thread pool still belongs in the architecture."
publishedAt: "2026-09-10"
category: "Spring Boot"
tags:
  - Spring Boot
  - Virtual Threads
  - Tomcat
  - Performance
sources:
  - title: "Spring Boot Virtual Threads"
    publisher: "Spring Boot docs"
    url: "https://docs.spring.io/spring-boot/reference/features/spring-application.html#features.spring-application.virtual-threads"
  - title: "JEP 444: Virtual Threads"
    publisher: "OpenJDK"
    url: "https://openjdk.org/jeps/444"
---

Spring Boot 3.2+ can run request handling on **virtual threads** (`spring.threads.virtual.enabled=true`). Tomcat (or Jetty) then starts a virtual thread per servlet request instead of borrowing from a 200-thread pool. Blocking JDBC and `RestClient` calls no longer occupy a scarce platform thread. Throughput under blocking I/O can jump. This is not a rewrite to WebFlux. It is a change of carrier.

## What actually switches

Boot auto-configures a virtual `Executor` for the embedded container and for some `TaskExecutor` beans. Verify with logs or a thread dump: names like `tomcat-handler-*` that are virtual. If you still have a custom `ThreadPoolTaskExecutor` of size 8 for HTTP outbound, you reintroduced a pool. `RestTemplate` with Apache HttpClient and a tiny max pool will bottleneck before the JVM does.

```properties
spring.threads.virtual.enabled=true
```

Use JDK 21+. Pinning (`synchronized` around blocking I/O) was a Loom headline; JDK 24's work on `synchronized` reduced that class of stalls, but native frames and some third-party JNI still pin. JFR events for virtual thread pinning are how you confirm. A library that does `synchronized (this) { socket.read() }` on a hot path is still a problem on older 21u lines.

## JDBC and connection pools

Virtual threads do not multiply Postgres. Hikari's `maximumPoolSize` remains the database's concurrency limit. A million virtual threads waiting on a pool of 10 is a wait queue. Size Hikari for the database, not for "unlimited threads." Timeouts must still fire.

CPU-bound work (crypto, huge JSON) on virtual threads can starve carriers if you spawn unbounded compute. Bound CPU with a semaphore or keep a platform pool for that.

## When to stay on platform threads or WebFlux

If the app is already reactive and non-blocking to the metal, virtual threads are optional. If you have thread-locals that assume pooling (some tracing, some security contexts), test. Spring has been updating `TaskDecorator` and observation; third-party filters may not have.

Load-test with blocking I/O similar to production. Compare p99 and CPU. If you gain nothing, you were CPU-bound or pool-bound at Hikari. If you gain a lot, you were thread-starved in Tomcat — the original pitch.

Read Boot's virtual threads section and JEP 444's pinning notes for your JDK version. Then dump threads during a load test. If you still see 200 `http-nio` platform workers and no virtual threads, the flag did not take, or the container was customized around it.
