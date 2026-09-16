---
title: "SOLID Principles Without the Strawmen"
slug: "solid-principles-practical-guide"
description: "What each SOLID principle actually asks of your code, shown with realistic examples instead of Animal-extends-Dog toys."
publishedAt: "2026-07-02"
updatedAt: "2026-09-16"
category: "Software Engineering"
tags:
  - Design Patterns
  - Software Architecture
  - Java
  - Clean Code
---

SOLID has a public relations problem: it is usually taught with toy hierarchies and absolutist rules, then dismissed as enterprise ceremony. Underneath the acronym, though, are five specific observations about why code becomes hard to change. Here they are in working terms.

## S — Single Responsibility

The useful phrasing is not "a class should do one thing" but **"a module should have one reason to change."** Responsibility is about *who asks for changes*, not about line count.

```java
public class InvoiceService {
    public Invoice create(Order order) { /* pricing rules  — product team */ }
    public String renderPdf(Invoice invoice) { /* layout — design team */ }
    public void submitToTaxAuthority(Invoice invoice) { /* compliance — legal */ }
}
```

Three different stakeholders can force a release of this one class. Splitting it isn't aesthetic — it isolates each change stream, shrinks blast radius, and lets tests focus.

## O — Open/Closed

**Open for extension, closed for modification** means: adding a *new case* shouldn't require editing every place that handles existing cases. The enemy it targets is the ever-growing switch:

```java
public BigDecimal shippingCost(Order order) {
    return switch (order.carrier()) {
        case DHL -> dhlRates.calculate(order);
        case FEDEX -> fedexRates.calculate(order);
        // every new carrier edits this method, and the five like it
    };
}
```

When variants multiply, invert it: a `Carrier` interface, one implementation per carrier, discovered via a registry or dependency injection. When variants are stable and few, the switch is *fine* — sealed types plus exhaustive switches are a legitimate modern answer. The principle tells you what the trade is; it doesn't ban branches.

## L — Liskov Substitution

A subtype must honor the *promises* of its supertype — not just its method signatures. Every override that throws `UnsupportedOperationException`, silently ignores input, or tightens preconditions breaks a caller that was written against the base contract.

The classic real-world offender is inheriting for convenience: extending a collection to "borrow" its methods, then panicking on mutations you didn't want to support. Composition — wrapping instead of extending — sidesteps the broken promise entirely.

## I — Interface Segregation

Fat interfaces force implementers to care about methods their callers never use, and force callers to depend on churn in methods they never call.

```java
// Before: every consumer sees everything
public interface UserStore {
    User findById(String id);
    void save(User user);
    void recalculateRecommendations(String id);
    byte[] exportGdprArchive(String id);
}
```

Callers reveal the seams: the signup flow needs `save`, the profile page needs `findById`, the batch job needs the export. Three small interfaces (which one class may still implement together) mean each consumer compiles against exactly what it uses.

## D — Dependency Inversion

High-level policy should not import low-level detail; both should meet at an abstraction **owned by the policy side**. That ownership is the part people skip. `OrderService` depending on a `PaymentGateway` interface defined *in the orders package*, implemented by a Stripe adapter in an infrastructure package, keeps the arrow pointing the right way — the domain defines the contract, the detail conforms to it.

This is also what makes hexagonal / ports-and-adapters architecture tick: DIP applied at package scale.

## Using SOLID Like an Adult

- These are diagnostics, not commandments. Reach for them when change *hurts*, to name why.
- Premature abstraction has the same cost as premature optimization. Duplicate first; abstract when the second reason to change appears.
- The principles reinforce each other — most "SRP violations" are also ISP violations waiting for a caller.

The acronym is memorable; the underlying question is better: *when requirements change next month, how many files fight back?*

## A worked example

SRP: a class that both parses CSV and emails finance is split. OCP: new tax rules as strategy objects, not a 40-branch `if`. LSP: do not make `Square` extend `Rectangle` if setters break. ISP: clients do not depend on a 30-method god interface. DIP: domain depends on a `Payments` interface, Stripe is an adapter.

You apply one principle to a real PR, not a checklist of five for a DTO.

## Failure modes

15 interfaces for one implementation. SOLID as a reason to avoid a switch on a sealed type. DIP with an interface in the same file never implemented twice. SRP used to split a cohesive transaction. Cargo-cult visitor patterns.

"Solid" as a performance claim.

## When this is the wrong tool

A script. DTOs. Frameworks you do not own. If the language has functions, a function may beat a strategy hierarchy. Premature OCP for a change that never comes. Interviews that recite SOLID without a system. When a table-driven design is clearer than classes, use the table.
