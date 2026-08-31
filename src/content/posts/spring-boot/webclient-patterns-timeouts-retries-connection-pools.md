---
title: "WebClient in Production: Timeouts, Retries, and Connection Pools"
slug: "webclient-patterns-timeouts-retries-connection-pools"
description: "The WebClient configuration that RestTemplate never forced you to think about, and why the defaults are wrong for most production traffic."
publishedAt: "2025-05-30"
category: "Spring Boot"
tags:
  - Spring Boot
  - Java
  - Reactive
  - Backend Engineering
---

`WebClient.create()` works fine in a demo and is a liability in production. Out of the box it has no timeout, no retry policy, and a connection pool sized for convenience rather than your actual traffic pattern. Every one of those defaults needs a deliberate decision before the client touches a real downstream service.

## Timeouts on Every Layer That Can Hang

A single "timeout" setting isn't enough, because a slow call can get stuck at several different points: establishing the TCP connection, waiting for the response, or waiting idle inside the connection pool for a free connection.

```java
HttpClient httpClient = HttpClient.create()
        .option(ChannelOption.CONNECT_TIMEOUT_MILLIS, 2000)
        .responseTimeout(Duration.ofSeconds(5))
        .doOnConnected(conn -> conn
                .addHandlerLast(new ReadTimeoutHandler(5))
                .addHandlerLast(new WriteTimeoutHandler(5)));

WebClient client = WebClient.builder()
        .clientConnector(new ReactorClientHttpConnector(httpClient))
        .baseUrl("https://payments.internal.example.com")
        .build();
```

Without a `responseTimeout`, a downstream service that accepts the connection and then never replies will hold that request open indefinitely, and enough of those piling up will exhaust your event loop threads or your caller's own request budget. Set timeouts a few seconds tighter than whatever SLA you've promised your own callers, not tighter than the downstream's documented worst case — a timeout shorter than the operation can legitimately take just turns a slow success into a guaranteed failure.

## Retries Need Boundaries or They Make Things Worse

Retrying blindly on every error is how a struggling downstream service gets pushed into full outage — the retries themselves become the load that tips it over. Retry only on errors that are actually transient, and back off.

```java
webClient.get()
        .uri("/accounts/{id}", accountId)
        .retrieve()
        .bodyToMono(AccountDto.class)
        .retryWhen(Retry.backoff(3, Duration.ofMillis(200))
                .filter(ex -> ex instanceof WebClientRequestException
                        || (ex instanceof WebClientResponseException wcre
                            && wcre.getStatusCode().is5xxServerError()))
                .jitter(0.5));
```

Never retry on a 4xx — that's the server telling you the request itself is wrong, and resending it changes nothing except the log volume. And never retry a non-idempotent write (`POST`) without an idempotency key backing it, or a transient network failure on the first attempt can result in the operation happening twice.

## Connection Pools Sized for Reality, Not Guesswork

The default connection pool is a fixed size chosen without any knowledge of your traffic. Undersized, requests queue waiting for a free connection and your timeouts start firing under normal load. Oversized, you can exhaust the downstream service's own connection limits or your own memory.

```java
ConnectionProvider provider = ConnectionProvider.builder("payments-pool")
        .maxConnections(50)
        .pendingAcquireMaxCount(500)
        .pendingAcquireTimeout(Duration.ofSeconds(2))
        .maxIdleTime(Duration.ofSeconds(30))
        .build();

HttpClient httpClient = HttpClient.create(provider);
```

Size `maxConnections` from actual numbers: expected concurrent calls to this specific downstream, multiplied by how long each call typically takes, with headroom for traffic spikes — not a round number picked because it looked reasonable. `pendingAcquireTimeout` matters as much as the pool size itself: without it, a request waiting for a pool connection can wait far longer than any of your other timeouts would suggest, because it never even reached the point where those timeouts start counting.

## One Client Per Downstream, Not One Client for Everything

A single shared `WebClient` for every outbound call means one slow, unreliable downstream can exhaust the connection pool that a completely unrelated, healthy downstream also depends on. Give each significant downstream dependency its own `WebClient` bean with its own pool, timeouts, and retry policy tuned to that service's actual behavior. It's more configuration up front, but it turns "one dependency is having a bad day" into an isolated, contained problem instead of a cascading one.
