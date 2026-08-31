---
title: "Enforcing Module Boundaries in Spring Boot with Spring Modulith"
slug: "spring-modulith-enforcing-module-boundaries"
description: "How Spring Modulith turns package structure into an enforced architectural boundary, catching the coupling that code review alone tends to miss."
publishedAt: "2025-11-24"
category: "Spring Boot"
tags:
  - Spring Boot
  - Software Architecture
  - Java
  - Backend Engineering
---

Every monolith starts with clean package boundaries and, eighteen months later, has a `CustomerService` that some `OrderRepository` imports directly because it was faster than going through the intended interface. Nothing enforced the boundary, so it eroded one convenient shortcut at a time. Spring Modulith exists specifically to take that erosion out of code review's hands and put it into a build step that fails.

## Modules Are Just Packages, Until You Verify Them

Spring Modulith treats each top-level package under your main application package as a module, with public API defined by what's exposed at that top level and everything in nested packages treated as module-internal by default.

```
com.example.shop
├── order
│   ├── Order.java
│   ├── OrderService.java
│   └── internal
│       └── OrderRepository.java
├── customer
│   ├── Customer.java
│   ├── CustomerService.java
│   └── internal
│       └── CustomerRepository.java
```

Anything in `order.internal` is invisible to `customer`, and vice versa, by convention alone — until you add a test that actually checks it.

```java
class ModularityTest {

    ApplicationModules modules = ApplicationModules.of(ShopApplication.class);

    @Test
    void verifiesModuleStructure() {
        modules.verify();
    }

    @Test
    void documentsModules() {
        new Documenter(modules)
                .writeDocumentation()
                .writeIndividualModulesAsPlantUml();
    }
}
```

`modules.verify()` fails the build the moment `order` reaches into `customer.internal.CustomerRepository` directly instead of going through `CustomerService`. That single test is what turns "we try to keep modules decoupled" into an actual, CI-enforced guarantee — the same kind of value a linter provides for code style, applied to architecture instead.

## Cross-Module Communication Without Direct Coupling

Modulith doesn't forbid modules from interacting — it forbids them from reaching into each other's internals. The intended pattern for cross-module effects is the same Spring application events covered elsewhere: a module publishes an event, and other modules react without a compile-time dependency on each other's internal types.

```java
public record OrderPlacedEvent(Long orderId, Long customerId) {}

@Service
public class OrderService {
    private final ApplicationEventPublisher publisher;

    public void placeOrder(OrderRequest request) {
        Order order = save(request);
        publisher.publishEvent(new OrderPlacedEvent(order.getId(), request.customerId()));
    }
}
```

```java
@Component
class CustomerLoyaltyListener {

    @ApplicationModuleListener
    void on(OrderPlacedEvent event) {
        loyaltyService.addPoints(event.customerId(), event.orderId());
    }
}
```

`@ApplicationModuleListener` is Modulith's own annotation, layered over `@TransactionalEventListener` and `@Async`, and it integrates with Modulith's event publication registry — an optional, JDBC-backed log of published events that guarantees at-least-once delivery even across an application restart between publish and handling. For cross-module side effects that genuinely can't be lost, that durability guarantee is worth the extra table.

## When This Is Worth Adopting

Spring Modulith earns its place in a modular monolith specifically — a single deployable where the team wants microservice-style boundaries without microservice-style operational overhead. It's most valuable for a team of meaningful size (roughly five or more engineers touching the same codebase) where informal conventions about "don't reach into that package" have already started breaking down in practice. For a small team or a genuinely simple service, the enforcement is solving a coupling problem that hasn't materialized yet, and the module test failures will feel like friction rather than protection. The honest signal that it's time is a specific memory: someone recently found a cross-module import in review that shouldn't have existed, and everyone quietly agreed "we should catch that automatically" — Modulith is that automatic catch.
