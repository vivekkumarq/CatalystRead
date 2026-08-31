---
title: "Observability in Spring Boot with Micrometer and OpenTelemetry"
slug: "observability-micrometer-opentelemetry-spring-boot"
description: "How Micrometer and OpenTelemetry fit together in a Spring Boot service, and which metrics and traces are worth instrumenting by hand versus for free."
publishedAt: "2025-10-14"
category: "Spring Boot"
tags:
  - Spring Boot
  - Observability
  - Micrometer
  - OpenTelemetry
---

Spring Boot gives you a surprising amount of observability for free through Actuator and Micrometer, and it's tempting to stop there. But "free" metrics tell you the shape of your application's HTTP and JVM behavior, not whether a specific business operation is healthy — that gap is where deliberate instrumentation with Micrometer, plus distributed tracing through OpenTelemetry, earns its cost.

## What You Get Without Writing Any Code

Adding `micrometer-registry-prometheus` (or another registry) and Actuator instruments JVM memory and GC, HTTP request latency and count per endpoint, data source connection pool usage, and thread pool metrics — all automatically.

```yaml
management:
  endpoints:
    web:
      exposure:
        include: health,metrics,prometheus
  metrics:
    tags:
      application: order-service
    distribution:
      percentiles-histogram:
        http.server.requests: true
```

`percentiles-histogram` matters more than it looks like it should: without it, you get averages, and an average latency can look perfectly healthy while p99 is in the gutter for a meaningful slice of your traffic. Histogram buckets let your dashboards and alerts compute real percentiles instead of hiding tail latency behind a mean.

## Custom Metrics for Things Nobody Else Can See

HTTP-level metrics can't tell you whether checkout is succeeding at a healthy rate, or how many orders are getting stuck in a specific status. Those need explicit instrumentation with a `MeterRegistry`, injected like any other bean.

```java
@Service
public class CheckoutService {

    private final Counter checkoutSuccessCounter;
    private final Counter checkoutFailureCounter;
    private final Timer checkoutTimer;

    public CheckoutService(MeterRegistry registry) {
        this.checkoutSuccessCounter = Counter.builder("checkout.completed")
                .tag("outcome", "success").register(registry);
        this.checkoutFailureCounter = Counter.builder("checkout.completed")
                .tag("outcome", "failure").register(registry);
        this.checkoutTimer = Timer.builder("checkout.duration").register(registry);
    }

    public CheckoutResult checkout(Cart cart) {
        return checkoutTimer.record(() -> {
            try {
                CheckoutResult result = processCheckout(cart);
                checkoutSuccessCounter.increment();
                return result;
            } catch (CheckoutException ex) {
                checkoutFailureCounter.increment();
                throw ex;
            }
        });
    }
}
```

Using one metric name (`checkout.completed`) with an `outcome` tag, rather than two separately named counters, keeps them queryable together in dashboards — "success rate" becomes a single ratio query instead of a join across two differently named series. This is a Micrometer convention worth adopting broadly: prefer tags over metric name proliferation.

## Tracing: Following One Request Across Services

Metrics tell you *that* checkout got slower; distributed tracing tells you *where* — which of the five downstream calls a single checkout request makes actually accounted for the latency. Spring Boot 3's Micrometer Tracing, paired with the OpenTelemetry bridge, propagates trace context automatically across `RestClient`/`WebClient` calls and messaging.

```yaml
management:
  tracing:
    sampling:
      probability: 0.1
  otlp:
    tracing:
      endpoint: http://otel-collector:4318/v1/traces
```

`sampling.probability: 0.1` is a deliberate trade-off, not a default to leave unexamined: tracing every single request is expensive to store and mostly redundant once you have metrics for aggregate behavior, but sampling too low means the one trace you need during an incident was never captured. A common pattern is a low baseline sample rate combined with always-sample-on-error, so failures are never the ones that get dropped.

```java
@Bean
Sampler otelSampler() {
    return Sampler.parentBased(Sampler.traceIdRatioBased(0.1));
}
```

## Instrument for Questions You'll Actually Ask

The failure mode with observability tooling isn't usually under-instrumentation, it's instrumenting everything indiscriminately until dashboards are too noisy to read during an incident. Before adding a metric or a custom span, it's worth being able to state the question it answers — "what's our checkout success rate by payment provider" is a question; "let's track every method call duration just in case" is not. Metrics and traces that map to specific operational or business questions stay useful for years; ones added reflexively get ignored until someone finally deletes them.
