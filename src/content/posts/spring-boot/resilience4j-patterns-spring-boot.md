---
title: "Circuit Breakers, Bulkheads, and Retries: Resilience4j in Spring Boot"
slug: "resilience4j-patterns-spring-boot"
description: "How to combine Resilience4j's circuit breaker, bulkhead, and retry modules in Spring Boot without letting them fight each other."
publishedAt: "2025-06-17"
category: "Spring Boot"
tags:
  - Spring Boot
  - Java
  - Microservices
  - Backend Engineering
---

A retry policy and a circuit breaker solve opposite-looking problems that are actually the same problem viewed at different timescales: what do you do when a downstream call fails. Used together without coordination, they can amplify each other — a circuit breaker that never sees enough failures to trip because retries are quietly absorbing them, followed by a much worse collapse when the retries finally stop keeping up. Resilience4j gives you the pieces; wiring them in the right order is the part that takes judgment.

## Circuit Breaker: Stop Calling a Service That's Down

A circuit breaker tracks the failure rate of calls to a dependency and, once it crosses a threshold, stops making calls entirely for a cooldown period — failing fast instead of piling up slow, doomed requests.

```yaml
resilience4j:
  circuitbreaker:
    instances:
      inventoryService:
        sliding-window-size: 20
        minimum-number-of-calls: 10
        failure-rate-threshold: 50
        wait-duration-in-open-state: 15s
        permitted-number-of-calls-in-half-open-state: 5
```

```java
@CircuitBreaker(name = "inventoryService", fallbackMethod = "fallbackStock")
public StockLevel checkStock(String sku) {
    return inventoryClient.getStock(sku);
}

private StockLevel fallbackStock(String sku, Throwable ex) {
    return StockLevel.unknown(sku);
}
```

The fallback method is what makes a circuit breaker safe to ship — without one, an open circuit just turns every call into an exception, moving the failure rather than containing it. Design the fallback around what's actually acceptable to your callers: a cached last-known value, a conservative default, or an explicit "temporarily unavailable" response your UI can handle gracefully.

## Retry: Only Below the Circuit Breaker

Retries should sit *inside* the circuit breaker's protection, not outside it — retry a handful of times per call while the circuit is closed, but once the breaker opens, stop retrying and go straight to the fallback. Getting the annotation order wrong (or misconfiguring the decorator chain in code) means retries keep hammering a downstream the circuit breaker has already decided is unhealthy.

```java
@Retry(name = "inventoryService")
@CircuitBreaker(name = "inventoryService", fallbackMethod = "fallbackStock")
public StockLevel checkStock(String sku) {
    return inventoryClient.getStock(sku);
}
```

```yaml
resilience4j:
  retry:
    instances:
      inventoryService:
        max-attempts: 3
        wait-duration: 100ms
        retry-exceptions:
          - java.io.IOException
        ignore-exceptions:
          - com.example.NotFoundException
```

Annotation order matters: Resilience4j applies decorators from the innermost (closest to the annotated method) outward, so `@Retry` above `@CircuitBreaker` means each retry attempt is what the circuit breaker observes and counts toward its failure rate — the arrangement you almost always want.

## Bulkhead: Contain the Blast Radius

A bulkhead limits how many concurrent calls can be in flight to a given dependency, so a slow downstream can't consume every thread in your application and starve unrelated request handling. It's the difference between "the inventory service is slow" and "the inventory service is slow, and now checkout is down too because there are no threads left to serve it."

```yaml
resilience4j:
  bulkhead:
    instances:
      inventoryService:
        max-concurrent-calls: 25
        max-wait-duration: 500ms
```

```java
@Bulkhead(name = "inventoryService")
@Retry(name = "inventoryService")
@CircuitBreaker(name = "inventoryService", fallbackMethod = "fallbackStock")
public StockLevel checkStock(String sku) {
    return inventoryClient.getStock(sku);
}
```

## Watch the Metrics, Not Just the Config

None of this is "set once and forget" — a `failure-rate-threshold` and `sliding-window-size` chosen without real traffic data are guesses. Resilience4j publishes detailed metrics (state transitions, call outcomes, wait times) through Micrometer; wire them into your dashboards and revisit the thresholds once you have a few weeks of actual behavior. A circuit breaker that never trips might be correctly configured, or it might be set so loosely it's providing no protection at all — you can't tell the difference without the data.
