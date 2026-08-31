---
title: "Idempotency Keys: How Stripe Made Payment Retries Safe"
slug: "stripe-idempotency-keys-and-safe-retries"
description: "How Stripe's idempotency key design lets clients safely retry payment requests after a timeout without risking a duplicate charge."
publishedAt: "2025-10-02"
category: "Stripe"
tags:
  - Engineering at Scale
  - Stripe
  - APIs
  - Payments
trending: true
---

Every payments API eventually runs into the same nightmare scenario: a client sends a request to charge a card, the network times out before the response comes back, and now nobody knows whether the charge went through. Retry blindly and you might charge the customer twice. Don't retry and a legitimate payment might silently vanish. For most APIs this is an annoying edge case; for Stripe, whose entire business is moving money correctly, it's a problem that has to be solved at the API design level, not patched around by each integrating merchant.

## Idempotency keys

Stripe's solution is to let clients attach an idempotency key — typically a client-generated UUID — to any API request that mutates state, like creating a charge. If Stripe receives a second request carrying the same idempotency key, because the client's original request timed out and it retried, Stripe doesn't process it as a new charge. Instead, it returns the stored result of the original request. If the original request is still being processed when the retry arrives, Stripe coordinates so the retry waits for and receives that same result rather than racing ahead and creating a second charge.

This shifts the retry problem from "did my request actually happen?" — which the client generally cannot answer from a timeout alone — to "attach a key once, and retry as many times as you want," which is a much easier contract for integrating engineers to reason about and get right.

## The details that make it hold up

A key generated once has to mean the same thing on every retry, so Stripe checks the request parameters against the stored request tied to that idempotency key. If a client reuses a key but sends different parameters, the request is rejected as an error, rather than silently returning a stale response for a different intended operation — this is what stops a subtle class of bugs where a key is accidentally reused across genuinely different requests. Idempotency keys are scoped per API credential, and stored results expire after a bounded window, commonly cited around 24 hours, so the system isn't obligated to store every idempotency key forever.

## Pairing reliability with API versioning

Stripe has written about pairing this retry-safety discipline with a deliberate API versioning strategy: each merchant integration is effectively pinned to the API version that was active when they built against it, and Stripe maintains internal compatibility and transformation layers so that new API changes can ship continuously without breaking old, unmaintained integrations. Stripe has described operating a large number of API versions concurrently across its customer base as a result. The combination matters — idempotency keys protect against transient network failures during a single request, while version pinning protects against Stripe's own evolution breaking requests that used to work.

## What you can borrow

- Add idempotency key support to any endpoint that isn't naturally idempotent — payment creation, order placement, sending an email or notification — anywhere a client-side retry after a timeout could otherwise cause a duplicate side effect.
- Store idempotency results with a bounded time-to-live rather than forever; you need enough window to cover realistic retry behavior, not infinite storage.
- Validate the request body against the stored request tied to a reused key, not just the key's presence, to catch accidental key reuse across different requests.
- Think about API versioning and backward compatibility before you have thousands of integrations depending on exact current behavior — retrofitting it later is much harder than designing for it early.
