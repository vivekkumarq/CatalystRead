---
title: "Sorbet: Bringing Static Types to Millions of Lines of Stripe's Ruby"
slug: "stripe-sorbet-gradual-typing-for-ruby"
description: "Why Stripe built its own type checker, Sorbet, instead of rewriting its large Ruby codebase, and how gradual typing let adoption happen incrementally."
publishedAt: "2026-05-12"
updatedAt: "2026-09-16"
category: "Stripe"
tags:
  - Engineering at Scale
  - Stripe
  - Ruby
  - Developer Tools
---

Stripe's core API and much of its backend were built in Ruby, a language chosen partly for developer productivity in the company's early years. That same productivity-focused dynamism became a liability as the codebase and engineering team grew into the millions of lines and hundreds of engineers: Ruby's dynamic typing meant a lot of classes of bugs — calling a method that doesn't exist on an object, passing the wrong type of argument — were only caught at runtime, sometimes in production, rather than before code ever shipped. For a payments company, a runtime error in the wrong code path isn't a minor inconvenience.

## Why a rewrite wasn't the answer

The obvious alternative — rewrite the codebase in a statically typed language — wasn't realistic for a company with a large, continuously evolving Ruby codebase supporting a live business. A rewrite of that scale would take years, freeze feature velocity, and introduce enormous risk of its own, all to solve a problem that a well-designed tool could address without touching most of the existing code at all. Stripe's engineering team instead built Sorbet, a type checker for Ruby that let existing code keep running unchanged while gradually adding type annotations where they provided the most value.

## Gradual typing as the adoption strategy

Sorbet's central design choice was gradual typing: files and methods can be typed incrementally, at whatever level of strictness a team is ready for, rather than requiring the entire codebase to be fully typed before getting any benefit. A file could start completely untyped, move to a level where Sorbet checks it opportunistically, and eventually reach full strict typing, all without other, unrelated files needing to change at the same pace. This meant Stripe could start getting real value — catching a meaningful class of bugs at development time instead of runtime — from the parts of the codebase engineers chose to type first, typically the most critical or most bug-prone code, without blocking on a company-wide migration finishing first.

```ruby
# typed: strict
sig { params(amount: Integer, currency: String).returns(Charge) }
def create_charge(amount, currency)
  # ...
end
```

## A fast checker built for a huge codebase

Performance mattered as much as the gradual typing model. A type checker that takes minutes to run on every save is one engineers will route around. Sorbet was built for speed specifically because it needed to check millions of lines fast enough to run continuously in editors as engineers typed, not just as a slow CI-time gate run once per pull request. Stripe open sourced Sorbet in 2019, and it's since seen adoption at other companies with large Ruby codebases facing the same underlying tension between dynamic language productivity and static-typing safety.

## What a mid-size team can steal from Stripe's Sorbet

Stripe's Sorbet work is gradual typing in a huge Ruby estate, with a culture that types the boundaries that money crosses. Mid-size steal: a checker in CI, strictness on new money files, and generated signatures for the HTTP layer so params are not `Hash`. Skip a rewrite in a typed language if the staff is Ruby-shaped.

The concrete failure mode is `T.untyped` at the kernel of charging, which makes the rest of the type system theater. Another is runtime type checks on a hot parser that show up as CPU in a peak you thought you had bought with Kubernetes. Measure. Operational gotcha: DSLs and metaprogramming that the solver cannot see; wrap them. Gem updates that ship broken RBIs will red the build; pin and vendor the interface files you rely on. Stripe staffs language tooling. You can adopt Sorbet or RBS on one package and expand. The steal is the same as Facebook's Hack: do not wait for a greenfield. If CI typecheck is optional, it will be ignored. Make it blocking for the paths you care about, and keep it fast. A ten-minute typecheck is a tax that teaches people to bypass. Incremental checking is part of the reliability of the type bet.

## What you can borrow

- When a language or platform limitation is causing real bugs, a rewrite is rarely the first thing worth reaching for — a tool that layers safety onto the existing codebase can deliver most of the benefit with a fraction of the risk and time.
- Gradual, opt-in adoption lets teams get value from the highest-priority parts of a codebase immediately, instead of blocking any benefit on a full migration completing first.
- Tooling that's slow enough to disrupt an engineer's flow gets bypassed in practice, however good it is in principle — invest in speed as a first-class requirement, not an afterthought.
- Building an internal tool is worth open sourcing when your problem — dynamic language safety at scale, in this case — is shared widely enough that the maintenance cost gets spread across a broader community.
