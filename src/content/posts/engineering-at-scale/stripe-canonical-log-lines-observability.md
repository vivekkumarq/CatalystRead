---
title: "Canonical Log Lines: One Wide Event Instead of Scattered Logs"
slug: "stripe-canonical-log-lines-observability"
description: "Why Stripe engineers emit a single structured log line per request instead of many scattered ones, and how it changes debugging at scale."
publishedAt: "2025-06-18"
updatedAt: "2026-09-16"
category: "Stripe"
tags:
  - Engineering at Scale
  - Stripe
  - Observability
  - Logging
sources:
  - title: "Canonical Log Lines"
    author: "Brandur Leach"
    publisher: "brandur.org"
    url: "https://brandur.org"
  - title: "Stripe Engineering Blog"
    publisher: "Stripe"
    url: "https://stripe.com/blog"
---

A typical request through a service-oriented backend produces dozens of log lines: one when a handler starts, one for each database query, one for each downstream call, one for each conditional branch someone thought was worth noting. Individually each line is cheap to write and easy to reason about. Collectively, across a system handling a large volume of requests through many services, they become close to useless for the exact moment you need them most — when a specific request failed or was slow and you need to reconstruct what actually happened to it. Stripe engineers, most notably Brandur Leach, have written about a pattern that addresses this directly: the canonical log line, one comprehensive, structured line emitted per request instead of many fragments.

## The problem with scattered logs

When a request's story is spread across dozens of log lines, reconstructing it means finding all of them, in the right order, correctly attributed to that one request, often across multiple services and log storage systems. Request IDs help, but even with a shared ID, an engineer debugging an incident is stuck grepping and mentally re-assembling a timeline instead of just looking at the answer. Scattered logs are also expensive in aggregate: high-cardinality debug statements sprinkled throughout a codebase generate enormous log volume, most of which is never read, while still costing storage and ingestion capacity.

## One wide event, emitted once

The canonical log line pattern inverts this. Instead of emitting a log line at each point of interest during a request, code accumulates key-value facts into a shared context object as the request executes — which cache was hit, how long each downstream call took, which feature flags were active, what account made the request, what the final response status was — and only at the very end of the request, a single line is emitted containing every one of those fields. One request, one line, but a wide one: potentially dozens of fields packed into a single structured record.

```text
at=info method=POST path=/v1/charges account=acct_1a2b3c
status=200 duration_ms=142 db_queries=3 db_time_ms=18
cache=hit downstream_fraud_ms=41 idempotency_key=hit
```

## Why this beats scattered logs

A single wide event per request turns debugging into a query problem rather than an assembly problem. Because every field lives on the same line, an engineer can ask questions like "show me every request in the last hour where downstream fraud latency was over 200ms and the response was a 500" as a single filter, without joining log lines from different points in the codebase. It also makes the data naturally suited to columnar log analysis tools, where a wide, structured event is far more useful than free-text lines that have to be parsed line by line. And because there's exactly one line per request instead of many, overall log volume tends to drop even as the amount of useful information per request goes up.

### Implementation is mostly plumbing

The pattern itself is architecturally simple — the hard part is discipline. Middleware or a request-scoped context object needs to be threaded through every layer of the codebase so that any function, at any depth, can attach a fact to the eventual canonical line without needing to pass a logger explicitly through every call. Getting this wired in consistently across a large codebase, and getting engineers into the habit of adding fields to the shared context instead of reaching for a one-off log statement, matters more than any specific storage backend chosen for the resulting events.

## A concrete failure mode without canonical log lines

Canonical log lines put the whole request — status, actor, latency breakdown, ids — on one line so a grep during an incident is a story, not a scavenger hunt. The failure mode is 15 JSON micro-logs per request with uncorrelated ids, and a tracing system that was too expensive to sample at 100% when you needed it. Mid-size steal: one line per request at the edge of each service, with a request id you already put on the client response.

Operational gotcha: high-cardinality fields on the line (raw URL with ids) exploding log volume and cost, so someone turns logging down during the incident. Bound the fields. Another is PII: emails and card last-fours sneaking onto the line for "support." Redact, hash, or you will build a second, illegal warehouse. Canonical lines do not replace metrics; they explain a single bad request. Pair them with RED metrics. If you only log errors, you cannot compare a success that was slow. Sample successes if you must, but keep 100% of money-path lines. Stripe's style is boring on purpose. Adopt it in the API gateway first. When a customer pastes a request id into a ticket, you should jump to one line. If you cannot, your observability is a dashboard of averages, and averages do not refund people.

## What you can borrow

- Emit one structured event per unit of work (a request, a job, a batch) instead of many scattered log lines for the same unit of work.
- Thread a request-scoped context object through your call stack so any layer can attach fields without owning the final log call.
- Prefer wide, flat, structured fields over free-text messages — they're queryable without parsing.
- Log timing and status for every downstream dependency on the same line as the overall request outcome, not in a separate line you'll have to correlate later.
- Treat scattered debug logging as a smell once a canonical line exists — most of what a stray log statement would have told you should already be a field on the wide event.
