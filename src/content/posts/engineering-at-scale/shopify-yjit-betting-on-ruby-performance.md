---
title: "Betting on Ruby: How Shopify Made Rails Fast Enough for Commerce"
slug: "shopify-yjit-betting-on-ruby-performance"
description: "Shopify funded a just-in-time compiler for Ruby instead of rewriting its monolith, turning YJIT into a core piece of commerce infrastructure."
publishedAt: "2025-06-03"
category: "Shopify"
tags:
  - Engineering at Scale
  - Shopify
  - Ruby
  - Performance
---

When a platform processes checkout for hundreds of thousands of merchants, "just rewrite it in a faster language" sounds tempting and is almost always wrong. Shopify's core platform has been a Ruby on Rails monolith since its earliest days, and rather than walk away from that investment as traffic grew into the billions of requests, the company chose a different bet: make Ruby itself faster. That bet became YJIT, a just-in-time compiler built into the Ruby interpreter, funded and staffed largely by Shopify engineers working alongside Ruby core contributors.

## Why not just rewrite it

Rewrites of a mature, revenue-critical monolith carry enormous risk: months or years of feature freeze, subtle behavior regressions, and a moving target as the old system keeps shipping changes. Shopify's checkout, storefronts, and admin surfaces all sit on the same Rails codebase that thousands of internal developers touch daily. Ruby's expressiveness had made that developer velocity possible, but the interpreter's historical performance ceiling was a real cost at Shopify's scale, especially during traffic spikes like flash sales. Rather than trade velocity for speed, Shopify's language runtime team, led by researcher Maxime Chevalier-Boisvert, built a JIT compiler designed specifically to speed up real-world Ruby workloads rather than synthetic microbenchmarks.

## Building a JIT that respects how Ruby is actually written

YJIT takes a "lazy basic block versioning" approach: it compiles small units of code incrementally as they actually execute, specializing compiled code for the types and shapes it observes at runtime, and falling back gracefully when assumptions don't hold. This mattered because Rails applications lean heavily on Ruby's dynamic features — method_missing, metaprogramming, monkey-patched core classes — that make aggressive, whole-program optimization difficult. Instead of trying to out-clever those patterns, YJIT was tuned against production-representative benchmarks pulled from real Rails applications, including Shopify's own.

YJIT shipped as experimental in Ruby 3.1 and became production-ready enough that Shopify turned it on for its own storefront and checkout traffic, reporting meaningful reductions in response times and infrastructure needs without touching application code. Because it lived upstream in CRuby rather than as a Shopify-only fork, every Rails shop running a modern Ruby version got the same speedup for free — a deliberate choice to fix the ecosystem rather than build a private advantage.

```ruby
# No application code changes needed —
# YJIT is enabled at the interpreter level
RUBY_YJIT_ENABLE=1 ruby app.rb

# or via Ruby's own flag
ruby --yjit app.rb
```

## Performance as a platform investment, not a one-time project

What makes this story durable is that Shopify treated Ruby performance as ongoing infrastructure, not a one-off optimization sprint. The YJIT team kept iterating for years after the initial release, chasing warmup time, memory overhead, and edge cases discovered in production Rails apps. Shopify also invested in tooling to profile and simulate Black-Friday-scale load against YJIT-compiled code before rollouts, since a JIT's behavior under sustained peak traffic differs meaningfully from a quick benchmark run. The payoff showed up not as a headline number but as sustained capacity headroom: the same fleet handling more checkout traffic without a proportional increase in servers.

## What you can borrow

- Before rewriting a critical system in a "faster" language, measure whether the actual bottleneck is the language or the architecture around it — often it's the latter.
- Investing upstream, in the language or framework your stack depends on, can pay off broader than a private fork or workaround.
- Benchmark against your own representative workloads, not synthetic suites; dynamic languages behave very differently under real metaprogramming-heavy code.
- Treat performance work as continuous infrastructure with its own roadmap, not a single project with a finish line.
