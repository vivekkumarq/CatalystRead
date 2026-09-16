---
title: "Square's Idempotent Charges: The Same Tap Must Not Become Two Captures"
slug: "square-idempotent-card-charges"
description: "How Square's Payments API uses idempotency keys so retries from POS apps and readers do not double-charge cards."
publishedAt: "2026-11-29"
updatedAt: "2026-11-29"
category: "Square"
tags:
  - Engineering at Scale
  - Square
  - Payments
  - APIs
sources:
  - title: "Idempotency in Square APIs"
    publisher: "Square"
    url: "https://developer.squareup.com/docs/build-basics/common-api-patterns/idempotency"
  - title: "Payments API"
    publisher: "Square"
    url: "https://developer.squareup.com/reference/square/payments-api"
---

Card networks will happily authorize twice if you ask twice. Square's public Payments API documents idempotency keys for that reason: a POS, a backend, or a Terminal device will retry, and "retry" is not a new sale. The key is a string the client chooses, scoped so that a second request with the same key and the same payload returns the original payment, while a same key with a different body is a conflict. That contract is simple to explain and easy to implement wrong at the counter.

## Where the key has to live

If the key is generated after the reader returns, you already lost: a crash between authorize and persist cannot replay. The key must be born when the merchant hits charge, written to local storage, then sent. Square's servers remember the result for a documented window. Clients that mint a new UUID on every timeout are implementing the opposite of idempotency.

Square also has to deal with keys that are too clever: a key derived only from amount and merchant, so two real sales of $4 coffee collide. Keys should be unique per attempt-of-intent, not per amount. A UUID is boring and correct. Including the order id can be right if the order id is itself unique per tap.

## Concurrent retries

Two in-flight POSTs with the same key are the interesting case. The server must not run two authorizations against the network. That implies a lock or a "first writer wins, second waits" pattern, and a response that is the same payment object. Returning 500 on lock wait trains the client to generate a new key. Returning 409 on body mismatch trains the client to stop reusing keys across different carts.

Webhooks and Connect v2-style event streams must carry the payment id, not "we think it worked." Downstream inventory decrement should be idempotent on payment id too, or you will stock-out twice on one latte.

## Failure modes of idempotent charges

The concrete failure is a load balancer retry of a POST that already hit the acquirer, plus an application that did not send the key (or the proxy stripped the header). You have a double hold. Mid-size steal: keys required on all mutating payment endpoints, stored in a durable table with a hash of the body, not in a cache that evicts.

Operational gotcha: keys that expire in minutes while a cashier is still on hold with the bank. The second try is a new charge. TTL should cover realistic human delays, then a new sale should be a new key. Another is testing with a reused key in a shared sandbox and concluding the API is "broken" because it returns the first dummy payment. Namespace keys by merchant and environment. Partial failures: authorized but capture failed. Idempotency on create is not automatically idempotency on capture; each mutating step needs its own key or a state machine that no-ops. Support tooling should look up by idempotency key because that is what the POS has when the receipt printer jammed. If finance cannot join processor reports to Square payment ids, you will recon by amount and date, which is how you hide a double charge in a busy Saturday.

## What you can borrow

- Require client-chosen idempotency keys on every payment mutation, persisted before the first network call.
- Reject key reuse with a different body; do not silently return the old payment for a new cart.
- Serialize concurrent same-key requests; never answer a lock wait with a generic 500.
- Give capture, refund, and webhook handlers their own idempotent identities tied to the payment.
