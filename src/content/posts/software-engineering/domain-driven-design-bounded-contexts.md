---
title: "Bounded Contexts in Domain-Driven Design: The Map That Stops a Shared Database"
slug: "domain-driven-design-bounded-contexts"
description: "Evans and the later context-mapping patterns: ubiquitous language per context, anti-corruption layers, and why one Customer model is a lie."
publishedAt: "2026-09-02"
category: "Software Engineering"
tags:
  - Software Engineering
  - DDD
  - Architecture
  - Domain Modeling
sources:
  - title: "Domain-Driven Design"
    author: "Eric Evans"
    publisher: "Addison-Wesley, 2003"
    url: "https://www.domainlanguage.com/ddd/"
  - title: "Domain-Driven Design Distilled"
    author: "Vaughn Vernon"
    publisher: "Addison-Wesley"
    url: "https://www.informit.com/store/domain-driven-design-distilled-9780134434421"
---

DORA/Accelerate is already on this site as delivery metrics. This article is **domain modeling**: Eric Evans' **bounded context**. A model (`Customer`, `Order`) is only valid inside a boundary where the **ubiquitous language** is consistent. Billing's Customer is a payment method and a tax id. Support's Customer is a ticket history. Forcing one table and one class is how you get a god object and a year of mapping bugs.

## Draw the contexts before the microservices

A bounded context is a **linguistic** boundary. It may become a service, a module, or a database schema. Start with a **context map**: upstream/downstream, customer/supplier, **anti-corruption layer** (ACL) when you must consume a messy legacy model without letting its terms infect yours. **Shared kernel** is a small shared library — keep it small or it becomes the monolith again. **Conformist**: you accept the upstream's model as-is.

```text
Sales  --ACL-->  Legacy ERP (upstream)
Identity  --OHS (open host service)-->  several downstreams
```

Events (`OrderPlaced`) are translations at the edge, not a promise that every context's Order is the same.

## Tactical DDD is optional; the map is not

Aggregates, value objects, and repositories help **inside** a context. Using them across a shared DB without a map is ceremony. If two teams cannot agree what "closed" means for a ticket, they are in two contexts (or they need a meeting to merge language). Merging contexts is allowed; it is a product decision.

Microservices that share a database are usually one context pretending to be three. Microservices that chat in CRUD on each other's tables skipped the ACL.

## How to run a workshop

Event storming or just a whiteboard of terms that collide. Highlight homonyms. Assign ownership. Don't boil the ocean into 40 contexts in a week; find the 3 that already cause pain.

Read Evans' bounded context chapter and Vernon's distilled mapping patterns. Then pick one overloaded noun in your codebase and split the types, even if the table stays shared for a quarter. The type split is the first honest map. A new Kubernetes service without a language split is a bounded **deployment**, not a bounded context.
