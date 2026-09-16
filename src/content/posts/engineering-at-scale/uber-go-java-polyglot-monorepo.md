---
title: "Go, Java, and the Monorepos Holding Uber's Fleet Together"
slug: "uber-go-java-polyglot-monorepo"
description: "How Uber ended up running a polyglot backend split mainly between Go and Java, and why it consolidated each language's services into monorepos."
publishedAt: "2025-11-11"
updatedAt: "2026-09-16"
category: "Uber"
tags:
  - Engineering at Scale
  - Uber
  - Programming Languages
  - Developer Productivity
sources:
  - title: "Uber Engineering Blog"
    publisher: "Uber"
    url: "https://www.uber.com/blog/engineering/"
---

With thousands of backend microservices built over more than a decade by many different teams, Uber's service fleet ended up polyglot almost by default — early services in Python and Node.js, a period of heavy Go adoption for new infrastructure and performance-sensitive services, and a large and growing body of Java, particularly after Uber's acquisitions and its build-out of data and infrastructure platforms leaned toward the JVM ecosystem's maturity for those domains. Rather than trying to force the whole company onto one language, Uber's engineering leadership made a more pragmatic call: converge on a small number of primary languages, and invest heavily in the tooling — especially monorepos — needed to make each one productive at scale.

## Why Go, and why Java, rather than one winner

Go's appeal for Uber's infrastructure and high-throughput services was the usual set of reasons that drove its adoption industry-wide around the same period: fast compilation, a small and easy-to-learn language surface, strong built-in concurrency primitives well suited to the kind of network-heavy service code Uber writes constantly, and a runtime with a smaller memory footprint than JVM-based alternatives at comparable throughput. Java, meanwhile, had a different pull: an enormous existing ecosystem of mature libraries for data processing, the JVM's long track record in large-scale, long-running backend services, and a large pool of engineers already fluent in it, especially as Uber grew through hiring and acquisition. Rather than treat this as a language war to be settled, Uber's engineering organization accepted that different domains had genuinely different needs and let Go and Java both remain first-class, while other languages used for narrower purposes — Python for data science and some tooling, for instance — persisted alongside them without being pushed to compete for "primary backend language" status.

## Monorepos as the tooling answer to polyglot sprawl

Supporting multiple primary languages well is significantly harder than supporting one, and Uber's response was to build a monorepo for each major language's services rather than leaving thousands of services scattered across independent repositories. A monorepo per language let Uber apply consistent tooling for building, testing, and dependency management across every service written in that language, made large-scale refactors and shared-library upgrades tractable because the tooling could see and update every affected service in one place, and gave engineers a single, consistent way to check out and build code regardless of which team originally wrote it. That mattered enormously given the sheer number of services across the organization — coordinating changes to a shared library across thousands of independently-versioned repositories, each with its own build quirks, would have been far more brittle than coordinating changes within one well-tooled monorepo per language.

## Investment in build tooling as a prerequisite

None of this works without heavy investment in build systems capable of handling a monorepo at that scale — incremental builds that don't require rebuilding the entire repository for a small change, dependency graph analysis to determine what's actually affected by a change, and CI systems that can test only the affected subset of thousands of services rather than everything on every commit. Uber invested specifically in this tooling layer because a monorepo without it degrades into a slow, unusable shared workspace rather than the productivity win it's meant to be.

## Operational gotchas of a polyglot monorepo

Uber's Go/Java (and more) monorepo promised atomic changes and unified tooling across languages. The failure mode is a repo that takes 40 minutes to clone, CI that rebuilds the world, and a Bazel file nobody dares touch. Mid-size steal: a monorepo when the coupling is real, plus remote cache and path-based tests; skip it if teams ship independently and only meet at API contracts.

The concrete failure mode is an atomic commit that updates a proto and twenty services, then a rollback that cannot because mobile is already out. Version the contract anyway. Operational gotcha: language toolchains fighting in one image; Go modules vs vendored Java vs generated code merge conflicts. Generate in CI, not in random PRs. Ownership CODEOWNERS becomes a bottleneck if every common/ directory pages a platform person. Another is IDE performance; developers bypass the repo with copies. That is how you lose the only advantage. Uber could staff build. You can use a small monorepo for tightly coupled backends and separate the mobile app. Do not go polyglot in one repo without generated RPC and a single CI orchestrator. Measure mean time to green on a one-line change. If that number is hours, the monorepo is an incident in slow motion. Fix the graph of targets before adding a language.

## What you can borrow

- Standardizing on a small number of primary languages, matched to distinct domains, is usually more realistic than either a single company-wide language or unconstrained polyglot sprawl.
- A monorepo's benefits — consistent tooling, tractable cross-cutting refactors — depend entirely on investing in incremental build and test infrastructure; without that investment, a monorepo just gets slow.
- Let language choice follow the ecosystem strengths that actually matter for a given domain (concurrency-heavy services versus data-processing-heavy services) rather than a single company-wide mandate.
- Acquisitions and org growth will import language diversity whether you plan for it or not; decide deliberately which languages get long-term tooling investment.
