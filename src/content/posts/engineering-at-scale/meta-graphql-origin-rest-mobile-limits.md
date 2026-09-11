---
title: "Why REST Stopped Working for Facebook's Mobile Apps"
slug: "meta-graphql-origin-rest-mobile-limits"
description: "How Facebook's 2012 mobile rewrite exposed REST's limits and led to GraphQL, a query language built around what the client actually needs."
publishedAt: "2025-12-02"
category: "Meta"
tags:
  - Engineering at Scale
  - Meta
  - GraphQL
  - Mobile
sources:
  - title: "GraphQL: A data query language"
    author: "Lee Byron"
    publisher: "Facebook Engineering"
    url: "https://engineering.fb.com"
---

Facebook's 2012 mobile push — famously accompanied by Mark Zuckerberg's admission that betting on HTML5 for the mobile app had been a mistake — forced a rewrite of the News Feed as a native app. That rewrite ran straight into a data-fetching problem that REST, as Facebook had been using it, wasn't built to solve well: a single feed screen needed data shaped very differently from what the existing REST endpoints returned, and mobile networks made every extra round trip expensive in a way that didn't matter as much on the web.

## The REST endpoint explosion

With REST, a resource-oriented endpoint like `/posts/123` typically returns a fixed shape — the full post object, or close to it — regardless of whether the client needs every field. A News Feed screen showing posts, authors, comment previews, and like counts either meant making several separate REST calls to stitch together, or asking backend teams to build and maintain increasingly specific, feed-shaped endpoints that mixed several resources together. Over time, this second path produces a sprawl of narrow, single-purpose endpoints, each tightly coupled to one screen's needs, that become expensive to maintain and awkward to reuse once the next screen needs a slightly different combination of the same underlying data.

## Letting the client describe the shape it needs

Facebook's answer, developed internally starting around 2012 and later open sourced in 2015, was GraphQL: instead of the server dictating the shape of the response per endpoint, the client sends a query describing exactly which fields and nested relationships it needs, and the server returns exactly that shape — no more, no less. A single request could ask for a post's text, its author's name and profile photo, and the first three comments with their authors, all in one round trip, without the backend team needing to have pre-built an endpoint anticipating that specific combination. This directly attacked the two costs that mattered most on mobile: the number of round trips (collapsed to one) and the amount of data transferred (only requested fields, not the whole object).

## A typed schema as the contract

GraphQL's other core piece is a strongly typed schema that describes every object, field, and relationship the API exposes. This gave Facebook's client and server teams a shared, machine-checkable contract: client code could be validated against the schema at build time, catching a broken query before it ever reached production, and tooling could auto-generate documentation and client code from the same schema. That schema-first discipline turned out to matter as much for large-scale collaboration between many teams as the flexible querying did for mobile efficiency.

## What you can borrow

- If your API surface is sprouting many narrow, screen-specific endpoints, that's a signal your data-fetching model doesn't match your clients' actual needs — letting clients specify shape can be cheaper than maintaining that sprawl.
- Round trips are disproportionately expensive on mobile networks compared to the web; if you're optimizing a mobile API, collapsing multiple calls into one matters more than it might seem from web-first experience.
- A typed schema as a client-server contract catches integration bugs at build time instead of in production, and becomes the basis for auto-generated docs and tooling almost for free.
- GraphQL isn't free — it moves complexity into query planning and resolver performance on the server; adopt it because your fetching patterns genuinely need flexibility, not by default.
