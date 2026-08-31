---
title: "@Scheduled and @Async: The Thread Pools You Can't Leave on Default"
slug: "spring-scheduling-async-thread-pools"
description: "Why the default executors behind @Scheduled and @Async are wrong for production, and how to configure thread pools that actually match your workload."
publishedAt: "2025-08-05"
category: "Spring Boot"
tags:
  - Spring Boot
  - Java
  - Concurrency
  - Backend Engineering
---

`@Scheduled` and `@Async` are two of the easiest annotations in Spring to misuse, because they work correctly in development with a single scheduled job or a handful of async calls, and the default configuration only reveals itself as wrong once concurrency shows up for real. Both default to executors that are the wrong shape for almost any production workload.

## @Scheduled: One Thread for Every Job, By Default

Without explicit configuration, all `@Scheduled` methods in an application share a single-threaded scheduler. That's fine when you have one cron job. It's a quiet outage waiting to happen once you have three: if the first scheduled task runs long, every other scheduled task — regardless of its own cron expression — waits behind it, because there's only one thread to run any of them.

```java
@Configuration
@EnableScheduling
public class SchedulingConfig {

    @Bean
    TaskScheduler taskScheduler() {
        ThreadPoolTaskScheduler scheduler = new ThreadPoolTaskScheduler();
        scheduler.setPoolSize(10);
        scheduler.setThreadNamePrefix("scheduled-task-");
        scheduler.setErrorHandler(throwable -> log.error("Scheduled task failed", throwable));
        return scheduler;
    }
}
```

The error handler matters more than it looks: by default, an uncaught exception in a `@Scheduled` method is logged once and then that job simply stops being scheduled again — silently, with no alert. An explicit `ErrorHandler` at minimum gets the failure into your logs and metrics predictably; wiring it to increment a counter your alerting watches is what actually catches the regression instead of discovering it a week later when someone asks why a report stopped generating.

```java
@Scheduled(cron = "0 0 2 * * *")
public void reconcileNightlyLedger() {
    ledgerService.reconcile();
}
```

## @Async: The Default Is Unbounded, Which Is Its Own Failure Mode

`@Async` without a configured executor falls back to `SimpleAsyncTaskExecutor`, which doesn't pool threads at all — it spins up a brand-new thread for every single invocation and never reuses or limits them. Under a traffic spike, that's effectively an unbounded thread creation loop, and it will exhaust memory or hit the OS thread limit well before anything else in your application does.

```java
@Configuration
@EnableAsync
public class AsyncConfig implements AsyncConfigurer {

    @Override
    public Executor getAsyncExecutor() {
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
        executor.setCorePoolSize(8);
        executor.setMaxPoolSize(20);
        executor.setQueueCapacity(200);
        executor.setThreadNamePrefix("async-task-");
        executor.setRejectedExecutionHandler(new ThreadPoolExecutor.CallerRunsPolicy());
        executor.initialize();
        return executor;
    }

    @Override
    public AsyncUncaughtExceptionHandler getAsyncUncaughtExceptionHandler() {
        return (ex, method, params) -> log.error("Async method {} failed", method.getName(), ex);
    }
}
```

`CallerRunsPolicy` is a deliberate choice here: when the queue fills and the pool is maxed out, the task runs on the calling thread instead of being silently dropped or throwing a rejection exception the caller may not handle. It applies backpressure — the caller slows down — rather than failing invisibly.

## Naming Multiple Executors for Different Workloads

A single executor tuned for one workload is often wrong for another running in the same application — a burst of short email-send tasks and a handful of long-running report-generation tasks don't belong in the same pool, because the long tasks can starve the short ones of threads. Named executors solve this:

```java
@Bean("reportExecutor")
Executor reportExecutor() {
    ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
    executor.setCorePoolSize(2);
    executor.setMaxPoolSize(4);
    executor.setQueueCapacity(50);
    executor.setThreadNamePrefix("report-");
    executor.initialize();
    return executor;
}
```

```java
@Async("reportExecutor")
public CompletableFuture<Report> generateQuarterlyReport(Long accountId) { ... }
```

Sizing either kind of pool starts from the same question: is the work CPU-bound or I/O-bound? I/O-bound work (HTTP calls, database queries) tolerates a larger pool because threads spend most of their time waiting, not computing; CPU-bound work should stay close to the number of available cores, since more threads than that just adds context-switching overhead without more throughput.
