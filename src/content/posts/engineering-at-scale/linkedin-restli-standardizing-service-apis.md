---
title: "Rest.li: Standardizing APIs Across Hundreds of LinkedIn Teams"
slug: "linkedin-restli-standardizing-service-apis"
description: "How LinkedIn's move to a service-oriented architecture forced a standardized REST framework, and why schema-driven API contracts paid off at scale."
publishedAt: "2025-07-20"
category: "LinkedIn"
tags:
  - Engineering at Scale
  - LinkedIn
  - APIs
  - Service Architecture
sources:
  - title: "LinkedIn Engineering Blog"
    publisher: "LinkedIn"
    url: "https://engineering.linkedin.com"
---

As LinkedIn broke its original monolith apart into hundreds of independent services, a new kind of chaos emerged that had nothing to do with data storage or stream processing: every service team was inventing its own conventions for how to expose an API. Some returned XML, some JSON with inconsistent field naming, some encoded errors as HTTP status codes and others as payload fields, and pagination, filtering, and batching were all reinvented independently per service. Client code calling into these services ended up full of one-off logic to handle each service's quirks, and there was no reliable way to generate a client automatically or to reason about a service's contract without reading its implementation. LinkedIn built Rest.li to make API design a solved problem rather than something each team relitigated from scratch.

## Schema-first contracts, not implementation-first APIs

Rest.li's central idea was that an API's data model and interface should be defined declaratively, using a schema format called PDSC (later PDL), before any implementation code got written. A resource's schema described its fields, types, and structure independent of any particular service's Java classes, and Rest.li generated both the server-side bindings and strongly-typed client bindings from that same schema. This meant a service's contract was an explicit, versioned artifact rather than something implicit in whatever the code happened to serialize, and client and server could evolve somewhat independently as long as the schema contract was respected.

On top of the schema layer, Rest.li imposed real conventions on top of HTTP: consistent patterns for collection resources, association resources, and simple resources; consistent semantics for GET, CREATE, UPDATE, PARTIAL_UPDATE, DELETE, and batched variants of each; and a shared way to express finders (queries) and actions (RPC-style operations) that didn't fit the CRUD model cleanly. A service built with Rest.li automatically got a documentable, discoverable API shape rather than an ad hoc one.

```
resource.pdsc (schema) --> generated server bindings
                        \-> generated Java/Python client bindings
```

## Client-side load balancing and D2

Rest.li wasn't just an API framework — it was paired with D2 (Dynamic Discovery), a client-side service discovery and load-balancing layer. Instead of routing every inter-service call through a central load balancer, D2 let clients discover healthy service instances directly and distribute requests themselves, using cluster membership tracked in ZooKeeper. This combination meant that adopting Rest.li for a new service got you a generated type-safe client, a standardized API shape, and load-balanced service discovery all at once, which made it the path of least resistance for new services rather than a compliance burden layered on top of easier alternatives.

## Hundreds of services speaking one dialect

By standardizing on Rest.li, LinkedIn made it possible for any engineer to call into any other team's service with a generated client, predictable semantics, and automatic API documentation, without needing tribal knowledge about that specific service's conventions. LinkedIn open sourced Rest.li, and the framework's emphasis on schema-driven contracts influenced how the company later thought about API design more broadly, including efforts to unify internal and external-facing API surfaces.

## What you can borrow

- Define your API's data model in a schema before writing implementation code — generated bindings save far more time than they cost to set up, especially past a handful of services.
- Standardizing conventions (pagination, batch operations, error semantics) across services pays off nonlinearly as the number of services and callers grows.
- Pairing an API framework with client-side service discovery removes an entire class of routing infrastructure you'd otherwise need to build separately.
- Make the standardized path the easiest path — adoption follows convenience, not mandates.
