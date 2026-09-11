---
title: "Adding Types to a Runtime: Sorbet and Static Checking in Shopify's Rails Monolith"
slug: "shopify-sorbet-typed-ruby-static-checking"
description: "How Shopify layered gradual, static type checking onto a massive dynamically-typed Rails codebase using Sorbet without freezing feature work."
publishedAt: "2025-05-20"
category: "Shopify"
tags:
  - Engineering at Scale
  - Shopify
  - Ruby
  - Static Typing
sources:
  - title: "Sorbet: A Fast, Powerful Type Checker Designed for Ruby"
    publisher: "Stripe Engineering Blog"
    url: "https://stripe.com/blog"
  - title: "Shopify Engineering Blog"
    publisher: "Shopify"
    url: "https://shopify.engineering"
---

Ruby's dynamic nature is a huge part of why Shopify's core codebase could grow to thousands of contributors and millions of lines without collapsing under its own weight — but that same dynamism makes large-scale refactoring genuinely dangerous. A method rename, an argument reorder, or a deleted class can silently break a caller three layers away, and the only way to find out used to be running the code, or worse, shipping it. As the monolith grew, Shopify needed a way to catch that whole class of error before deploy, without asking thousands of engineers to give up the language they'd built their productivity around.

## Why Ruby needed gradual types

Rewriting the platform in a statically-typed language was never realistic — the cost of a rewrite at that scale dwarfs the benefit, and Ruby's flexibility was itself load-bearing for how quickly Shopify shipped features. The alternative was Sorbet, a type checker built for Ruby by Stripe and later open-sourced, which lets types be added incrementally, file by file, rather than requiring a codebase to be typed from day one. That gradual model was the only realistic path for an application already running in production: teams could annotate the code they owned when they had time, while the rest of the codebase kept running exactly as before.

## Rolling out a type checker without freezing the codebase

Sorbet organizes files into strictness levels — from `false`, where almost nothing is checked, up through `true` and `strict`, where every method signature and instance variable must be typed. Shopify's rollout leaned on this spectrum heavily: new code could be held to a high bar while the long tail of legacy files stayed at a looser level and got upgraded opportunistically. Method signatures are declared with Sorbet's `sig` syntax directly above the method they describe, which the checker verifies both statically, at edit and CI time, and optionally at runtime.

```ruby
class Order
  extend T::Sig

  sig { params(customer_id: Integer, total_cents: Integer).returns(Order) }
  def self.create_for_customer(customer_id, total_cents)
    # ...
  end
end
```

Because Sorbet ships as a language server, engineers got autocomplete, go-to-definition, and inline error checking in their editors, which made typing feel like a productivity gain rather than a tax — a big part of why adoption spread organically across teams rather than being mandated top-down everywhere at once.

## Living with a dynamic language and a type checker

The harder problem was Rails itself: metaprogrammed associations, dynamically defined methods, and ActiveRecord's runtime magic don't map cleanly onto static analysis. Shopify and the broader Sorbet ecosystem invested in tooling that generates type signatures (RBI files) for these dynamic constructs, effectively teaching the checker about patterns it couldn't see by reading the source directly. That tooling had to be maintained continuously as the schema and codebase evolved, making type coverage an ongoing infrastructure commitment rather than a one-time migration project.

## What you can borrow

- Gradual typing lets you add safety to a legacy codebase incrementally, file by file, instead of demanding a rewrite or a big-bang migration.
- Editor integration (autocomplete, inline errors) drives organic adoption far better than a mandate alone.
- For frameworks with heavy metaprogramming, budget real, ongoing effort for tooling that bridges dynamic patterns to static analysis.
- Let teams choose their own strictness level per file so the pace of adoption matches the risk and value of typing that particular code.
