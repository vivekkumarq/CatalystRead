---
title: "API Batching and the DataLoader Pattern"
slug: "api-batching-and-the-dataloader-pattern"
description: "How request batching and the DataLoader pattern eliminate N+1 query storms in APIs, with a look at when batching helps and when it just adds latency."
publishedAt: "2025-10-30"
updatedAt: "2026-09-16"
category: "Performance"
tags:
  - Performance
  - Backend Engineering
  - API Design
  - Databases
---

N+1 query problems have a way of hiding until production load reveals them. A GraphQL resolver that fetches a list of orders, then loops over each order to fetch its customer, looks perfectly reasonable in a code review and perfectly disastrous under real traffic, because one API call quietly becomes 101 database round trips. Batching exists to collapse those round trips back into something the database and network can handle efficiently.

## Why N+1 happens so easily

Resolver-based APIs and ORMs make N+1 patterns easy to write by accident because each individual fetch looks correct in isolation. A field resolver for `order.customer` that runs `SELECT * FROM customers WHERE id = ?` is fine on its own. The problem only appears when that resolver runs once per order in a list, and nobody notices until the list grows from 10 items in a demo to 500 in production, and the endpoint that used to take 40ms starts taking four seconds.

The fix isn't to avoid resolvers or ORMs, it's to defer execution and batch the deferred requests before they hit the database.

## The DataLoader pattern

DataLoader, originally built at Facebook for GraphQL, solves this with two ideas: batching and per-request caching. Instead of executing a fetch immediately, each call registers a key and returns a promise. DataLoader collects all keys requested within the same tick of the event loop, then issues a single batched fetch for all of them.

```javascript
const customerLoader = new DataLoader(async (customerIds) => {
  const customers = await db.query(
    'SELECT * FROM customers WHERE id = ANY($1)',
    [customerIds]
  );
  const byId = new Map(customers.map(c => [c.id, c]));
  return customerIds.map(id => byId.get(id) ?? null);
});

// Each call below queues a key; DataLoader batches them into one query
const results = await Promise.all(
  orders.map(order => customerLoader.load(order.customerId))
);
```

The batch function must return results in the same order as the input keys — that's the contract DataLoader relies on to map results back to the right caller. The per-request cache also means calling `.load(5)` twice within the same request returns the same promise instead of firing a second query, which matters when the same entity is referenced from multiple places in a response tree.

## Batching beyond GraphQL

The same idea applies outside GraphQL. REST APIs can expose batch endpoints (`POST /customers/batch` with a list of IDs) so clients avoid firing N sequential requests. Internal service-to-service calls benefit from the same treatment — a microservice that needs pricing for 50 SKUs should call a batch pricing endpoint once, not loop 50 times over the network.

## When batching isn't the answer

Batching adds a small amount of latency to the fastest individual request because it waits to collect a batch before firing. For latency-critical single-item lookups where batching opportunities are rare, that wait doesn't pay for itself. Batching also assumes the downstream system actually benefits from bulk requests — some legacy APIs or poorly indexed tables perform batch queries no better than N individual ones, in which case you've added complexity without gains.

The real signal that you need batching is a request pattern where the same expensive operation, keyed differently, executes many times within one logical request. Profile before adding a DataLoader layer everywhere; add it where the query counts actually spike with data volume, and measure the before-and-after query count, not just wall-clock time, since query count reduction is the leading indicator that the fix is actually working.

## A worked failure mode

A GraphQL page triggers 200 resolvers; each hits the DB. A DataLoader is added but keyed only on id, ignoring viewer ACL, so batching leaks a private row into another user's map. Another loader has no max batch size and builds a 10k-id `IN` that times out. Cache TTL is 5 minutes on a mutating object. The failure is batching without a key that includes auth and a bound. Include tenant and permission in the key, cap batches, and do not cache what you cannot invalidate.

## When this is the wrong tool

DataLoader is the wrong tool for a single query you can write as one SQL join. It will not fix an N+1 to a remote API with no batch endpoint. Do not batch writes that must be independent transactions. Use it for per-request coalescing of identical reads.

The wrong-tool test is easier with a concrete customer. If a user can lose money, lose access, or see someone else's data when "API Batching and the DataLoader Pattern" is slightly misapplied, do not let the pattern ride on defaults. Tighten the API, add an assertion in CI, and refuse silent fallbacks that look like success. Most production failures here are not exotic; they are a missing bound, a missing key, or a missing check that the original paper assumed a careful operator would have.
