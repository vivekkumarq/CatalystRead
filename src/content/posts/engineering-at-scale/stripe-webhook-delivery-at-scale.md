---
title: "Webhook Delivery at Scale: Retries, Ordering, and At-Least-Once"
slug: "stripe-webhook-delivery-at-scale"
description: "How Stripe delivers billions of webhook events to external endpoints reliably, with retries and an at-least-once contract instead of a guarantee of order."
publishedAt: "2025-07-22"
category: "Stripe"
tags:
  - Engineering at Scale
  - Stripe
  - Webhooks
  - Distributed Systems
sources:
  - title: "Stripe Engineering Blog"
    publisher: "Stripe"
    url: "https://stripe.com/blog"
---

Webhooks look simple from the outside: something happens on Stripe's side, and Stripe sends an HTTP request to a URL the merchant registered, telling their server about it. The reality underneath is a distributed delivery system that has to account for endpoints that are slow, endpoints that are down, endpoints that respond successfully but the response never makes it back, and endpoints that receive the same event twice. Stripe's business depends on merchants finding out reliably when a payment succeeded, a subscription renewed, or a dispute was opened, so webhook delivery has had to be engineered with the same seriousness as the API itself, even though the traffic flows in the opposite direction and the receiving server is entirely outside Stripe's control.

## Why delivery can't be fire-and-forget

A naive webhook system would fire an HTTP request when an event happens and consider the job done. That breaks immediately in practice: merchant servers get deployed, restart, hit unrelated bugs, or simply have bad days, and an event fired into a five-second window of downtime would be lost forever with no signal to anyone that it happened. Stripe instead treats every event as needing acknowledgment — a webhook endpoint has to respond with a successful HTTP status code, and until it does, the event isn't considered delivered.

## Retries with backoff, not a single attempt

When a delivery attempt fails — a timeout, a connection error, a non-success status code — Stripe retries, spacing subsequent attempts out with increasing delays rather than hammering an already-struggling endpoint immediately again. This continues over an extended window, giving a merchant's infrastructure time to recover from a deploy, an outage, or a burst of unrelated load, rather than treating a few seconds of downtime as a permanent failure to notify. Because retries happen automatically, a merchant's integration only needs to handle two things correctly: respond quickly with a success status once the event is safely queued for processing, and tolerate receiving the same event more than once.

## At-least-once, not exactly-once or ordered

This is the contract merchants actually receive, and it's a deliberate choice rather than a limitation nobody noticed: webhooks are delivered at least once, which means duplicate deliveries are possible and expected, and delivery order across different events is not guaranteed. Building a distributed system that guarantees exactly-once, perfectly-ordered delivery across the open internet to endpoints Stripe doesn't control is vastly harder and, in practice, less valuable than being explicit about the weaker guarantee and pushing the small amount of remaining work onto the integrator. Each event carries a unique event ID, so a merchant's handler can deduplicate by checking whether it has already processed that ID — the same idempotency principle that shows up throughout Stripe's own API design, applied here to the receiving side.

## Signing so endpoints can trust what arrives

Because a webhook endpoint is a public URL, anyone could in principle send it a forged request pretending to be Stripe. Every webhook delivery is signed with a secret unique to the merchant's endpoint, and Stripe's official libraries provide a signature verification step merchants are expected to run before trusting the payload — turning "an HTTP request arrived at my webhook URL" into "an HTTP request that I've cryptographically verified came from Stripe arrived at my webhook URL."

## What you can borrow

- Treat webhook delivery as at-least-once from day one, on both the sending and receiving side — don't design either half around an assumption of exactly-once.
- Retry failed deliveries with increasing backoff over an extended window rather than giving up after one or two attempts.
- Give every event a stable, unique ID so receivers can deduplicate cheaply instead of building their own idempotency scheme.
- Sign outbound webhook payloads and ship a verification helper — don't leave signature checking as an exercise for every integrator.
- Don't promise delivery ordering you can't actually guarantee; make the weaker, honest contract explicit in your docs instead of implying something stronger.
