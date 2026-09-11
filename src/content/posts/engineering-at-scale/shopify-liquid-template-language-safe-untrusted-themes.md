---
title: "Liquid: Designing a Template Language Safe Enough for Untrusted Themes"
slug: "shopify-liquid-template-language-safe-untrusted-themes"
description: "How Shopify built the Liquid templating language to safely run code written by outside theme developers on shared production servers."
publishedAt: "2026-04-30"
category: "Shopify"
tags:
  - Engineering at Scale
  - Shopify
  - Security
  - Language Design
sources:
  - title: "Shopify Engineering Blog"
    publisher: "Shopify"
    url: "https://shopify.engineering"
---

Every Shopify storefront is rendered from a theme, and themes are written by tens of thousands of independent developers, most of whom Shopify has never vetted and never will individually review line by line. Those templates run directly on Shopify's servers to render live storefronts for real merchants. That's an unusual security posture for a platform: it needs to let arbitrary outsiders write logic that executes on shared production infrastructure, without any single theme being able to read another merchant's data, exhaust shared resources, or execute arbitrary server-side code. Shopify's answer, dating back to the platform's earliest days, was to design its own template language, Liquid, rather than expose Ruby itself to theme authors.

## The threat model: untrusted templates at scale

Handing theme developers a general-purpose scripting language would have meant handing them the ability to open sockets, read the filesystem, or query arbitrary parts of the database — none of which a template that just needs to render "Hello, {{ customer.name }}" should ever be able to do. Liquid was built around a strict boundary: templates can only read data that's been deliberately exposed to them by the application, through objects Shopify calls "drops," and they have no path to arbitrary code execution, file I/O, or network access. The language itself simply has no syntax for those operations — safety isn't a runtime check bolted on afterward, it's a property of what the grammar can even express.

```liquid
{% if product.available %}
  <button>Add to cart — {{ product.price | money }}</button>
{% else %}
  <button disabled>Sold out</button>
{% endif %}
```

## A restricted surface, deliberately

Liquid gives theme authors variables, filters (like `money` or `upcase`), conditionals, and loops — enough expressiveness to build a genuinely sophisticated storefront — while keeping every data access mediated through drop objects that the core application controls explicitly. A theme can't reach into an ActiveRecord model and pull an arbitrary column; it can only see what the surrounding Rails code chose to expose to that specific context. That same restriction also protects performance: because Liquid can't make its own database calls or open its own connections, a runaway or badly written theme can't easily take down shared infrastructure the way an unrestricted scripting language could.

## Liquid outgrowing Shopify

Shopify open-sourced Liquid, and its design — safe, embeddable, restricted-by-construction — made it a natural fit anywhere a system needed to let non-trusted authors write templates: it's used well beyond Shopify's own storefronts, including in static site generators and other publishing tools that render user-authored content server-side. That afterlife is a reasonably strong endorsement of the original design constraint: a language built to be safe for one untrusted-input problem generalizes well to other untrusted-input problems that share the same shape.

## What you can borrow

- When a system must execute code written by parties you don't trust, prefer a purpose-built restricted language over sandboxing a general-purpose one — it's far easier to reason about what a grammar can't express than to police what a full interpreter can do.
- Mediate all data access through explicit, application-controlled objects rather than exposing your data layer directly to untrusted code.
- Treat "can't make its own I/O calls" as both a security property and a performance/stability property — it protects shared infrastructure from any one badly written client.
- A well-designed restricted-purpose tool can find a life well beyond its original use case; don't assume safety-first design trades away generality.
