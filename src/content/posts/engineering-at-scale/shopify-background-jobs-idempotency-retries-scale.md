---
title: "Background Jobs at Shopify Scale: Idempotency, Retries, and Interruptibility"
slug: "shopify-background-jobs-idempotency-retries-scale"
description: "How Shopify runs enormous volumes of background jobs safely, treating idempotency and graceful interruption as first-class design constraints."
publishedAt: "2025-09-15"
updatedAt: "2026-09-16"
category: "Shopify"
tags:
  - Engineering at Scale
  - Shopify
  - Ruby
  - Distributed Systems
---

Every order, inventory update, email, webhook, and app notification on Shopify eventually turns into a background job somewhere. At the platform's scale, that means an enormous, continuous stream of asynchronous work running on Sidekiq-based infrastructure, and it means the ordinary failure modes of distributed systems — a worker crashing mid-task, a deploy interrupting a running job, a network blip causing a duplicate enqueue — happen constantly rather than rarely. Shopify's approach to background jobs treats these failures as the expected case, not the exception, which shapes how jobs are written across the entire codebase.

## Idempotency as a job-authoring rule, not an afterthought

The core discipline Shopify engineers apply is idempotency: a job should be safe to run more than once with the same input and produce the same end state, because at-least-once delivery is the practical guarantee most queueing systems offer, and Shopify's own infrastructure is no exception. A job that charges a customer or decrements inventory needs to check its own prior effects — has this charge already been recorded, has this inventory adjustment already been applied — before acting, rather than assuming it's running for the first and only time.

```ruby
class CaptureShippingLabelJob
  def perform(order_id)
    order = Order.find(order_id)
    return if order.label_already_captured?

    label = ShippingProvider.generate_label(order)
    order.record_label(label)
  end
end
```

This sounds simple in isolation but becomes genuinely hard across thousands of job classes written by many teams, which is why Shopify invested in shared libraries and internal conventions — including tooling like the open-sourced `job-iteration` gem — to make the safe pattern the easy pattern rather than something each team reinvents.

## Interruptible jobs for a platform that deploys constantly

Because Shopify deploys extremely frequently, long-running background jobs are a particular hazard: a job iterating over millions of records can easily outlive the deploy window of the worker process running it. Shopify's `job-iteration` framework addresses this directly by giving long-running jobs a structured way to checkpoint their progress and yield control back to the scheduler between iterations, so a deploy or a rebalance can safely interrupt a job partway through and resume it later from a saved cursor, rather than forcing a choice between blocking deploys or killing jobs mid-flight and losing progress.

This pattern turns what would otherwise be a source of dropped work or corrupted partial state into an ordinary, expected event — jobs are simply written to assume they may be paused and resumed, the same way idempotent jobs assume they may run twice.

## Retries, backoff, and dead-letter handling

On top of idempotency and interruptibility, Shopify's job infrastructure layers standard resilience patterns: automatic retries with exponential backoff for transient failures, and dead-letter queues for jobs that exhaust their retry budget, so a persistently failing job surfaces for investigation instead of retrying forever or silently vanishing. Combined, these three properties — safe to repeat, safe to interrupt, and safe to fail loudly — let Shopify run background work at enormous volume without each individual job author needing to reason about distributed systems failure modes from scratch.

## Operational gotchas of shop jobs at flash-sale scale

Shopify's background jobs exist because a checkout cannot wait for email, webhooks, search indexing, and fraud checks. At flash-sale scale the queue is the product. The failure mode is a retry policy that duplicates a fulfillment request or a gift-card debit because the worker timed out after the partner API succeeded. Mid-size steal: an idempotency key per job type stored with the shop, and a poison queue that pages the owning team.

Operational gotcha: retry storms after a payment provider blip, which then DDoS the provider and extend the outage. Exponential backoff with jitter and a global concurrency cap per partner are not optional. Another is mixing latency-sensitive jobs (order confirmation) with bulk (reindex 100k products) on one Redis queue. Separate them. Sidekiq-style memory bloat from fat job payloads — stuffing whole product JSON in Redis — will evict or OOM at the worst time. Pass ids, load in the worker. Shopify also has to isolate shops: one merchant's bulk import cannot starve another's checkouts. Tenant-aware queues or weighted fair scheduling is the steal. If you run a marketplace or multi-tenant SaaS, copy that isolation before you copy any particular Ruby job library. Dead letters that contain PII need the same retention policy as the database, not infinite Redis.

## What you can borrow

- Write every background job as if it might run twice; check for prior effects before performing side effects like charges or notifications.
- If your jobs can run long, give them a way to checkpoint progress so a deploy or restart doesn't force a full restart from zero.
- Standardize retry and backoff behavior in shared libraries rather than leaving every team to hand-roll it.
- Route jobs that exhaust retries to a visible dead-letter queue instead of letting them fail silently.
