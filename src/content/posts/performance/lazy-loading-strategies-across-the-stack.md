---
title: "Lazy Loading Strategies Across the Stack"
slug: "lazy-loading-strategies-across-the-stack"
description: "Lazy loading isn't just deferred images — the same principle applies to JS bundles, database relations, and API responses, each with its own trade-offs."
publishedAt: "2025-02-10"
updatedAt: "2026-09-16"
category: "Performance"
tags:
  - Performance
  - Lazy Loading
  - Frontend
  - Backend
---

Lazy loading gets introduced to most engineers through a single example — images below the fold — and that narrow framing undersells how broadly the same principle applies. The core idea is always the same: don't pay the cost of loading something until the moment you actually need it. Where it gets interesting is that the "cost" and the "moment you need it" look completely different depending on which layer of the stack you're in.

## Frontend: bundles and below-the-fold content

Code splitting is lazy loading applied to JavaScript itself — instead of shipping one bundle containing every route and feature, the initial load ships only what's needed for the first screen, and the rest loads on demand.

```javascript
// Only fetched when the user actually navigates to /settings
const SettingsPage = lazy(() => import("./SettingsPage"));
```

The trade-off to watch for is the loading state introduced at the boundary — a lazily loaded route that isn't prefetched will show a spinner on first navigation, which is a bad trade if that route is one click away from the homepage and visited by nearly everyone. Prefetching on hover or on idle, rather than lazy loading with no prefetch at all, often gets the bundle-size benefit without the visible delay.

Image and iframe lazy loading is the more familiar case, and it's largely a solved problem now that `loading="lazy"` is a native HTML attribute rather than something requiring a JavaScript library and an IntersectionObserver. The remaining judgment call is which images to exclude — anything above the fold, especially a likely LCP candidate, should load eagerly, because lazy loading your hero image is a common and avoidable way to hurt perceived load time.

## Backend: relations and computed fields

The same principle shows up in ORMs as the choice between eager and lazy loading of related records. An ORM that lazily loads associations by default is convenient until it produces an N+1 query pattern — a loop over a hundred orders, each one triggering a separate query for its line items, turning one request into a hundred and one round trips to the database.

```python
# N+1: one query per order to fetch line items
for order in orders:
    print(order.line_items)  # triggers a query each iteration

# Eager loading: one additional query, fetched up front
orders = Order.query.options(joinedload(Order.line_items)).all()
```

The inverse mistake is eager-loading everything by default, which front-loads cost onto every request regardless of whether that request needs the related data. The right default depends on access pattern: eager-load associations you know the endpoint will use, lazy-load ones that are only sometimes needed, and treat any lazy-loaded association accessed inside a loop as a bug waiting to be found by whoever profiles the endpoint later.

## API design: fields and pagination as lazy loading

Lazy loading extends naturally into API contract design, even though it's rarely labeled that way. A `GET /users/:id` endpoint that returns a full object graph — the user, their orders, each order's line items, each line item's product — is eagerly loading everything a client might conceivably want, whether or not this particular client needs it. Field selection (letting a client specify which relations to include) and pagination (never returning an unbounded list by default) are lazy loading applied to response payloads instead of code or database rows.

## The general rule

Across all of these layers, the same two questions decide whether lazy loading is the right call: is the resource genuinely unlikely to be needed for a meaningful share of requests, and is the cost of loading it on-demand — a spinner, a second round trip, a cache miss — cheaper than the cost of always loading it upfront. When both answers are yes, lazy loading is close to free performance. When the resource is needed almost every time anyway, lazy loading just moves the cost later and adds a loading state on top of it.

## A worked failure mode

Images are lazy-loaded below the fold including the LCP hero; LCP gets worse. A JS module for checkout is lazy and the button does nothing for 2s on 3G. Backend lazy-loads ORM graphs in a loop. The failure is lazy as a default, not as a trade. Eager the critical path; lazy the rest with loading UI.

## When this is the wrong tool

Lazy loading is the wrong tool for the thing the user came to do. Do not lazy-split a 2kb helper into a waterfall. Use it for truly optional weight.

A second, quieter failure is operational: the idea is copied from a talk into a path that has no rollback, no owner, and no metric that would show the invariant breaking. For "Lazy Loading Strategies Across the Stack", that usually means a Friday deploy with production as the first realistic test. Write down the user-visible symptom, the invariant, and the revert before you scale the pattern. If revert is a data rewrite, you do not have a revert—you have a project. Practice the failure in staging with production-sized data at least once, or you will practice it on customers.
