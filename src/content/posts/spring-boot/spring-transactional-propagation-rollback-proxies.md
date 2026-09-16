---
title: "Understanding @Transactional: Propagation, Rollback Rules, and the Proxy Behind It"
slug: "spring-transactional-propagation-rollback-proxies"
description: "A practical look at how Spring's @Transactional works through dynamic proxies, why self-invocation silently breaks it, and how propagation settings actually behave."
publishedAt: "2025-02-04"
updatedAt: "2026-09-16"
category: "Spring Boot"
tags:
  - Spring Boot
  - Java
  - Transactions
  - Backend Engineering
---

`@Transactional` looks like a switch you flip on a method. In reality it's a contract enforced by a proxy that Spring builds around your bean at startup, and most of the surprising bugs people file against it — the ones where "the annotation isn't working" — come from not understanding that proxy's boundaries.

## The Proxy You Don't See

When a bean has a `@Transactional` method, Spring wraps it in either a JDK dynamic proxy (if it implements an interface) or a CGLIB subclass proxy (if it doesn't). Every call from outside the bean goes through the proxy, which opens a transaction, invokes your real method, and commits or rolls back based on what happened. Every call from *inside* the bean — one method calling another on `this` — skips the proxy entirely and calls the real object directly. No proxy, no transaction.

```java
@Service
public class OrderService {

    public void placeOrder(Order order) {
        // Self-invocation: bypasses the proxy, no transaction starts here
        saveOrder(order);
    }

    @Transactional
    public void saveOrder(Order order) {
        orderRepository.save(order);
    }
}
```

The usual fix is to move `saveOrder` into a separate bean and inject it, or to inject `OrderService` into itself via `@Lazy` and call through the proxy. Neither is elegant, but the underlying rule — transactions only apply across bean boundaries — is worth internalizing rather than working around every time.

## Propagation Isn't Optional Reading

`Propagation.REQUIRED`, the default, joins an existing transaction if one is active or starts a new one if not. That covers most CRUD code, but three other settings solve real problems:

- `REQUIRES_NEW` suspends the caller's transaction and starts an independent one. Use it for audit logging or notification records that must persist even if the enclosing business transaction later rolls back.
- `NESTED` starts a savepoint inside the current transaction. A failure rolls back to the savepoint, not the whole transaction — useful for "try this, and if it fails, continue without it" logic, but it depends on JDBC savepoint support and doesn't work with every driver.
- `MANDATORY` throws if no transaction is already active, which is a good guardrail for repository methods that should never be called outside a service-layer transaction.

```java
@Transactional(propagation = Propagation.REQUIRES_NEW)
public void recordAuditEntry(AuditEvent event) {
    auditRepository.save(event);
}
```

## Rollback Rules Are Opt-In, Not Automatic

Spring's default rollback policy trips people up constantly: a transaction rolls back automatically on unchecked exceptions (`RuntimeException` and its subclasses) but *commits* on checked exceptions unless told otherwise. If your codebase uses checked exceptions for business errors — `InsufficientFundsException extends Exception`, say — the transaction will happily commit right through the failure.

```java
@Transactional(rollbackFor = InsufficientFundsException.class)
public void transfer(Account from, Account to, BigDecimal amount) throws InsufficientFundsException {
    if (from.getBalance().compareTo(amount) < 0) {
        throw new InsufficientFundsException(from.getId());
    }
    from.debit(amount);
    to.credit(amount);
}
```

The safer long-term pattern is to standardize on unchecked exceptions for anything that should trigger a rollback, and reserve `rollbackFor` for the exceptions your team hasn't migrated yet. Also remember that catching an exception inside the transactional method and swallowing it prevents rollback entirely — the proxy only sees exceptions that actually propagate out of the method call.

Finally, watch transaction boundaries around read-heavy code. `@Transactional(readOnly = true)` doesn't enforce immutability, but it does let Hibernate skip dirty checking and lets some drivers optimize the connection, which adds up on high-traffic query paths. Getting these three things right — proxy boundaries, propagation choice, and explicit rollback rules — resolves the overwhelming majority of "why didn't my transaction roll back" tickets before they're ever filed.

## A worked example

`@Transactional` on `OrderService.place`. Default rollback on runtime exceptions. A nested `REQUIRES_NEW` for an audit row that must commit even if the outer rolls back — used rarely. A test `@Transactional` + `@Rollback` vs Testcontainers commit tests.

Calling `this.place()` skips the proxy: no transaction.

## Failure modes

Checked exceptions not rolling back (`rollbackFor`). `NOT_SUPPORTED` accidentally suspending. Long transactions holding row locks. Read-only flag ignored by some drivers. Catching exceptions inside the method so Spring never sees them. Mixing JPA and JDBC without understanding the same TX.

`@Transactional` on a private method.

## When this is the wrong tool

A read-only GET that does one query may not need the annotation if you are careful with OSIV. Do not sprinkle `REQUIRES_NEW` to "fix" errors. Distributed transactions are not `@Transactional` across HTTP. If you use a template with explicit `TransactionTemplate`, that can be clearer for unusual propagation. Reactive transactions are a different API.
