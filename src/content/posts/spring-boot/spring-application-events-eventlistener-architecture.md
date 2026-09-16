---
title: "Decoupling with Spring Application Events and @EventListener"
slug: "spring-application-events-eventlistener-architecture"
description: "Using Spring's application event system to decouple side effects from core business logic, and the transactional pitfalls that come with it."
publishedAt: "2025-07-21"
updatedAt: "2026-09-16"
category: "Spring Boot"
tags:
  - Spring Boot
  - Java
  - Software Architecture
  - Backend Engineering
---

A service method that places an order shouldn't also know how to send a confirmation email, update a recommendation engine, and notify a fraud-detection service. Those are side effects of the order being placed, not part of placing it, and Spring's application event system is the built-in tool for keeping that distinction in the code, not just in your head.

## Publishing Without Knowing Who's Listening

The publisher only needs `ApplicationEventPublisher` and a plain event object — no dependency on any of the eventual listeners.

```java
public record OrderPlacedEvent(Long orderId, String customerEmail, BigDecimal total) {}

@Service
public class OrderService {

    private final ApplicationEventPublisher publisher;

    @Transactional
    public Order placeOrder(OrderRequest request) {
        Order order = orderRepository.save(Order.from(request));
        publisher.publishEvent(new OrderPlacedEvent(order.getId(), request.email(), order.getTotal()));
        return order;
    }
}
```

Any number of listeners can react without `OrderService` changing at all — that's the entire value proposition. Adding a new side effect to order placement becomes "write a new listener," not "modify the order service and hope nothing else in that method depends on execution order."

```java
@Component
public class OrderNotifications {

    @EventListener
    public void sendConfirmation(OrderPlacedEvent event) {
        emailClient.sendOrderConfirmation(event.customerEmail(), event.orderId());
    }
}
```

## The Transaction Timing Trap

By default, `@EventListener` methods run synchronously, in the same thread, as part of the same call stack as the publish — which means they also run inside the same transaction if one is active. That's a problem for `OrderPlacedEvent`: if the listener runs before the enclosing `@Transactional` method commits, and the order row hasn't actually persisted yet from another connection's point of view, a listener that queries the order back out can get stale or missing data, and if the listener throws, it can roll back the entire order placement over what should have been a non-critical side effect like a notification failure.

`@TransactionalEventListener` fixes both problems by deferring execution until the transaction reaches a specific phase:

```java
@Component
public class OrderNotifications {

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void sendConfirmation(OrderPlacedEvent event) {
        emailClient.sendOrderConfirmation(event.customerEmail(), event.orderId());
    }
}
```

`AFTER_COMMIT` is the right phase for the overwhelming majority of side effects — the listener only fires once the data is actually durable, and if there's no active transaction when the event is published, `@TransactionalEventListener` won't fire at all, which is worth testing for explicitly if a listener sometimes gets called outside a transactional context.

## Async When the Listener Shouldn't Block the Caller

A synchronous listener still runs on the caller's thread, so a slow email provider makes order placement slow. Combining `@Async` with `@TransactionalEventListener` moves the work off the request thread entirely.

```java
@Async
@TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
public void sendConfirmation(OrderPlacedEvent event) {
    emailClient.sendOrderConfirmation(event.customerEmail(), event.orderId());
}
```

This requires `@EnableAsync` and a properly configured executor — the default `SimpleAsyncTaskExecutor` spins up an unbounded number of threads, which is fine for a demo and a resource leak under real load.

## Where Events Stop Being the Right Tool

Events are for side effects, not for orchestrating a multi-step business process where each step's success determines whether the next one should happen. If listener B's failure needs to affect whether listener A's work is considered complete, that's a workflow with a defined outcome, not a fire-and-forget notification — model it as an explicit sequence of calls instead. Reaching for events to avoid an awkward dependency between two services that are actually tightly coupled just hides the coupling instead of removing it.

## A worked example

After commit, `OrderPlacedEvent` is published via `ApplicationEventPublisher`. A `@TransactionalEventListener(phase = AFTER_COMMIT)` sends email. In-transaction listeners that update a projection run `BEFORE_COMMIT` only if they must see the same TX. Tests use `ApplicationEvents` or a fake publisher.

You keep the payload an id plus essentials, not a live entity.

## Failure modes

Listeners that throw and rollback unexpectedly (phase wrong). Sync listener doing HTTP. Events as a public API across JARs with no schema. `@Async` listener without an error handler. Publishing from a non-Spring thread. Circular events.

Using events to replace a method call in the same class.

## When this is the wrong tool

A method call is clearer for one consumer in the same module. For integration across services, a broker plus outbox, not in-process events. Do not use Spring events as an audit log (they vanish on crash). `@EventListener` is the wrong tool for high-volume domain storms — consider a queue. Transactional outbox if the listener is "publish to Kafka."
