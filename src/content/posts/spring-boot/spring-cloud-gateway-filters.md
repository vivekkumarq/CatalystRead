---
title: "Spring Cloud Gateway Filters: Where Routing Stops Being a Reverse Proxy"
slug: "spring-cloud-gateway-filters"
description: "Global versus GatewayFilter, ordered chains, request mutation, and the failure modes of putting business logic in the gateway."
publishedAt: "2026-09-06"
category: "Spring Boot"
tags:
  - Spring Boot
  - Spring Cloud Gateway
  - API Gateway
  - Reactive
sources:
  - title: "Spring Cloud Gateway reference"
    publisher: "VMware / Broadcom"
    url: "https://docs.spring.io/spring-cloud-gateway/reference/"
  - title: "GatewayFilter factories"
    publisher: "Spring Cloud Gateway docs"
    url: "https://docs.spring.io/spring-cloud-gateway/reference/spring-cloud-gateway/gatewayfilter-factories.html"
---

Spring Cloud Gateway is a WebFlux application that routes HTTP and applies a **filter chain** per route. Predicates pick the route (`Path`, `Host`, `Header`). Filters rewrite the request, call the downstream, then rewrite the response. If you treat it as "nginx in Java," you will put too much domain logic on the event loop and discover that a blocking JDBC call in a filter stalls everyone.

## Global filters versus per-route factories

`GlobalFilter` instances run for every request (security headers, access logs, correlation ids). `GatewayFilter` factories are attached in YAML or Java DSL per route (`AddRequestHeader`, `Retry`, `CircuitBreaker`, `RequestRateLimiter`). Order is explicit: `Ordered` and the `GatewayFilter` chain's `filter(exchange, chain)` continuation. Mis-ordered auth versus routing is how unauthenticated requests leak to a backend or how CORS preflights die.

```yaml
spring:
  cloud:
    gateway:
      routes:
        - id: orders
          uri: lb://orders-service
          predicates: [ Path=/orders/** ]
          filters:
            - StripPrefix=1
            - name: Retry
              args:
                retries: 3
                statuses: BAD_GATEWAY
```

`StripPrefix` is the filter you forget, then the backend 404s. `Retry` on **POST** is how you double-charge; retries want idempotent methods or idempotency keys. `RequestRateLimiter` needs a `KeyResolver` (IP versus user) and Redis; a mis-keyed limiter either does nothing or locks a whole NAT.

## Mutation is copy-on-write

The `ServerWebExchange` is immutable-ish: you `mutate()` to change path, headers, or principal. Filters that cache the body (`ReadBodyPredicate`, caching request filters) must buffer. Buffering unbounded JSON is a memory incident. Set limits. For streaming uploads, do not install a filter that needs the full body.

Downstream timeouts (`Netty` connect/response) belong in the HTTP client config, not as hope. Circuit breakers wrap the proxy call; they do not fix a slow app.

## What not to put in the gateway

Full OAuth token introspection that calls a slow IdP on every request without cache. Business validation that duplicates the service. Aggregating three backends into one response (BFF) — possible, but you now own a composition layer with fan-out failure modes. Keep the gateway a **policy and routing** layer: TLS, authn/z, rate limits, path rewrite, canary predicates.

Reactive code in custom filters must not block. `publishOn`/`subscribeOn` with a bounded elastic pool is an escape hatch, not an architecture.

Read the filter factory list, then `DEBUG` log the route id and filter order on one request. If you cannot explain the chain, you do not have a gateway design. You have a YAML file.
