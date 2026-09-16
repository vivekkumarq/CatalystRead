---
title: "Designing Idempotent Endpoints: Keys, Storage, and Semantics"
slug: "idempotent-endpoints-keys-storage-semantics"
description: "A concrete pattern for idempotency keys in Spring Boot APIs, covering storage choice, request matching, and what to return on a replayed request."
publishedAt: "2025-12-15"
updatedAt: "2026-09-16"
category: "Spring Boot"
tags:
  - Spring Boot
  - REST APIs
  - Backend Engineering
  - Databases
---

Networks retry. Clients retry. A mobile app that times out waiting for a response has no way to know whether the request succeeded on the server before the connection dropped, so it sends it again. For a `GET`, that's harmless. For a `POST` that charges a card or places an order, a naive retry means doing it twice — and "add a unique constraint and catch the exception" only gets you partway to a correct solution.

## The Contract: Same Key, Same Result, Every Time

An idempotency key is a client-generated unique token — typically a UUID — sent with a mutating request, that the server uses to recognize a retry and return the original result instead of repeating the operation.

```java
@PostMapping("/payments")
public ResponseEntity<PaymentResult> createPayment(
        @RequestHeader("Idempotency-Key") String idempotencyKey,
        @Valid @RequestBody PaymentRequest request) {

    return idempotencyService.executeOnce(idempotencyKey, request, () -> paymentService.charge(request));
}
```

The key comes from the client, not the server, because the client is the only party that knows whether two requests represent the same logical intent or two genuinely separate ones. Generating the key server-side defeats the purpose entirely.

## Storage: A Record Per Key, With Enough State to Detect a Race

The simplest correct implementation stores three things per key: the request fingerprint (to detect the same key reused for a different payload, which should be rejected), the current status, and the result once known.

```sql
CREATE TABLE idempotency_keys (
    id VARCHAR(64) PRIMARY KEY,
    request_hash VARCHAR(64) NOT NULL,
    status VARCHAR(20) NOT NULL,
    response_body JSONB,
    response_status INT,
    created_at TIMESTAMP NOT NULL DEFAULT now(),
    expires_at TIMESTAMP NOT NULL
);
```

```java
@Transactional
public <T> ResponseEntity<T> executeOnce(String key, Object request, Supplier<T> operation) {
    String requestHash = hash(request);

    Optional<IdempotencyRecord> existing = repository.findByIdForUpdate(key);
    if (existing.isPresent()) {
        IdempotencyRecord record = existing.get();
        if (!record.getRequestHash().equals(requestHash)) {
            throw new IdempotencyKeyConflictException(key);
        }
        if (record.getStatus() == Status.COMPLETED) {
            return ResponseEntity.status(record.getResponseStatus()).body(record.getResponseBody());
        }
        throw new RequestInFlightException(key); // another request with this key is still processing
    }

    repository.insertInProgress(key, requestHash);
    T result = operation.get();
    repository.markCompleted(key, result);
    return ResponseEntity.ok(result);
}
```

`findByIdForUpdate` — a `SELECT ... FOR UPDATE` — matters more than it looks like it should: without a row lock, two concurrent requests carrying the same key can both see "no existing record" and both proceed to execute the operation, which is exactly the double-charge scenario the whole mechanism exists to prevent. The insert-in-progress row before running the operation is what closes that race — the second concurrent request finds a row already there and waits or rejects, rather than racing past the check.

## What to Return, and When Keys Expire

A replayed request should get back exactly what the original request would have returned — same status code, same body — because from the client's perspective it's the same request, and returning a different shape on retry breaks any client logic written against the original response contract. Reject a reused key with a mismatched payload with a `409 Conflict`; that's a client bug (a key got reused across two logically different requests) worth surfacing loudly rather than silently accepting.

Keys don't need to live forever. A retention window of 24–72 hours covers realistic retry scenarios — client timeout and retry, mobile app backgrounded and resumed, load balancer failover — without the table growing without bound. A scheduled job (or a database TTL, where the store supports one) sweeping expired rows keeps the table small enough that the lookup on every request stays fast.

## Idempotency Keys Are Not a Substitute for Database Constraints

Treat the idempotency layer as a fast-path optimization that catches the overwhelming majority of retries cleanly, not as the only correctness guarantee. Keep a real unique constraint on the underlying business data too — an `order_number` or a payment's provider transaction ID — as the last line of defense for the rare gap the idempotency table doesn't catch, such as a key that legitimately expired between a client's first attempt and its retry.

## A worked failure mode

Idempotency keys are stored in memory per pod. Retries hit another pod and double-charge. Keys expire in 10 seconds while the client retries in 30. The key is derived from user id only, colliding unrelated payments. The failure is a key store that is not shared and a key that is not unique per intent. Shared TTL store, client-generated keys per attempt bundle, same request hash.

## When this is the wrong tool

Idempotency keys are the wrong tool for GET. They will not fix a non-atomic downstream. Do not key only on user. Use them on money and create endpoints clients retry.

Copy-paste from an internal success is still a failure mode. The last team had different traffic, a different datastore, and six months of scars. "Designing Idempotent Endpoints: Keys, Storage, and Semantics" should be adopted with the scars attached: the dashboard they wished they had, the migration they feared, the incident that made the rule. If those artifacts are missing, you are adopting a slide. Spend a day interviewing the last on-call before you spend a quarter implementing their diagram.
