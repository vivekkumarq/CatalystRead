---
title: "Liquid: Designing a Template Language Safe Enough for Untrusted Themes"
slug: "shopify-liquid-template-language-safe-untrusted-themes"
description: "How Shopify built the Liquid templating language to safely run code written by outside theme developers on shared production servers."
publishedAt: "2026-04-30"
updatedAt: "2026-09-16"
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

## What a mid-size team can steal from Liquid

Liquid's lesson is a language whose grammar cannot express the dangerous operations, used for untrusted themes on shared servers. Mid-size platforms — marketplaces, email builders, report designers — still hand users JavaScript or full ERB and then try to sandbox it. Steal a template language or a strict subset, mediate data through drops, and cap loop iterations and render time.

The concrete failure mode is a theme that is "safe" but still expensive: nested loops over all products, recursive snippets, or filters that allocate huge strings, starving neighboring shops. Safety is also noisy-neighbor control. Operational gotcha: adding one "just a little" escape hatch — a filter that fetches HTTP, a way to eval — undoes the grammar bet. Treat the surface as an API with a changelog. Theme upgrades that assume new drop fields will break old themes if you remove data; deprecate slowly. XSS is still possible in a safe language if you mark strings as HTML too eagerly; auto-escape by default. Shopify could staff Liquid as a product. If you cannot, prefer an existing sandboxed templating library rather than a homemade parser that will have one security hole. Audit every new filter like a new public API, because for attackers it is one.

## What you can borrow

- When a system must execute code written by parties you don't trust, prefer a purpose-built restricted language over sandboxing a general-purpose one — it's far easier to reason about what a grammar can't express than to police what a full interpreter can do.
- Mediate all data access through explicit, application-controlled objects rather than exposing your data layer directly to untrusted code.
- Treat "can't make its own I/O calls" as both a security property and a performance/stability property — it protects shared infrastructure from any one badly written client.
- A well-designed restricted-purpose tool can find a life well beyond its original use case; don't assume safety-first design trades away generality.
