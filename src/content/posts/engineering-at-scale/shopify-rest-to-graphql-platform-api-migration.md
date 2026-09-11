---
title: "From REST to GraphQL: Rebuilding Shopify's Platform API"
slug: "shopify-rest-to-graphql-platform-api-migration"
description: "Why Shopify moved its Admin and Storefront APIs from REST to GraphQL as the primary way tens of thousands of apps talk to the platform."
publishedAt: "2025-11-10"
category: "Shopify"
tags:
  - Engineering at Scale
  - Shopify
  - GraphQL
  - API Design
sources:
  - title: "Shopify Engineering Blog"
    publisher: "Shopify"
    url: "https://shopify.engineering"
  - title: "GraphQL Ruby Documentation"
    publisher: "graphql-ruby"
    url: "https://graphql-ruby.org"
---

Shopify's platform is only as valuable as the ecosystem of apps built on top of it, and for years that ecosystem talked to Shopify through a REST Admin API — versioned endpoints returning fixed JSON shapes for products, orders, customers, and inventory. That worked well enough when the API surface was small, but as Shopify's data model grew more interconnected, REST's fixed responses started costing real money: apps routinely had to fire several sequential requests just to assemble one screen, over-fetching fields they didn't need and under-fetching ones they did.

## Where REST started to strain

A merchant-facing app showing an order with its line items, fulfillment status, and customer details might need three or four separate REST calls, each returning a whole resource whether the app needed ten fields or two. At Shopify's request volume — driven by tens of thousands of third-party apps plus Shopify's own admin surfaces — that overfetching wasn't just an inconvenience, it was measurable load on backend services and measurable latency for developers building on the platform. Versioning was its own headache: every breaking change meant a new API version, and Shopify had to keep multiple versions running simultaneously for backward compatibility, multiplying the surface area the platform team had to maintain and test.

## Betting on GraphQL as the primary API

Shopify adopted GraphQL early relative to the rest of the industry, and invested directly in the Ruby GraphQL ecosystem — the `graphql-ruby` library that much of the Rails GraphQL world runs on is maintained with deep Shopify involvement. GraphQL let API consumers describe exactly the shape of data they needed in a single request, collapsing what used to be several REST round trips into one query the server could resolve efficiently server-side.

```graphql
query {
  order(id: "gid://shopify/Order/12345") {
    name
    totalPriceSet { presentmentMoney { amount currencyCode } }
    lineItems(first: 10) {
      nodes { title quantity }
    }
  }
}
```

The schema itself became a form of documentation and a contract: fields are strongly typed, deprecations are visible directly in the schema rather than buried in changelog prose, and tools built on introspection let developers explore the API without leaving their editor.

## Migrating an ecosystem, not just an endpoint

The hard part wasn't building a GraphQL API — plenty of companies do that. It was migrating an ecosystem of independent, third-party-owned apps that depended on REST staying stable, some of which hadn't been touched by their developers in years. Shopify's approach was gradual: GraphQL was introduced alongside REST, given years to mature and reach feature parity, and only after that parity was reached did Shopify begin formally deprecating REST endpoints on a calendar-based schedule, giving developers a long, clearly communicated runway rather than an abrupt cutover.

## What you can borrow

- Overfetching and underfetching compound at scale — measure how many round trips your API consumers actually need for common screens, not just per-endpoint latency.
- A strongly typed schema functions as living documentation; deprecations become visible in tooling instead of hidden in release notes.
- When migrating a public-facing API with third-party consumers, run the old and new systems in parallel for a long overlap period before deprecating anything.
- Communicate API sunsets on a fixed, published calendar rather than an open-ended "eventually" — predictability matters more to integrators than speed.
