---
title: "Blaze and Bazel: The Build System a Monorepo Requires"
slug: "google-blaze-bazel-build-system"
description: "How Google's internal Blaze build system, and its open-source descendant Bazel, made fast, reproducible builds possible across a codebase of billions of lines."
publishedAt: "2026-05-19"
category: "Google"
tags:
  - Engineering at Scale
  - Google
  - Developer Tools
  - Build Systems
sources:
  - title: "Bazel Documentation"
    publisher: "Bazel"
    url: "https://bazel.build"
  - title: "Google Open Source Blog"
    publisher: "Google"
    url: "https://opensource.googleblog.com"
---

A monorepo with billions of lines of code creates a build problem that ordinary build tools weren't designed for: you can't afford to rebuild the entire codebase, or even naively check whether the entire codebase needs rebuilding, every time one engineer changes one file. Traditional build systems like Make work fine for a single project's dependency graph, but scale poorly to a codebase where a single build might depend, transitively, on thousands of other internal libraries maintained by teams the person building has never talked to. Google's answer was Blaze, the internal build system that underlies almost everything built at the company, later released to the public in a reimplemented open-source form called Bazel.

## Hermetic, reproducible builds as the non-negotiable rule

Blaze's foundational principle is that builds must be hermetic: given the same source code and the same build inputs, a build should produce byte-for-byte identical output regardless of what machine ran it, what else was installed on that machine, or what time it ran. This sounds like an obvious property to want, but most build systems don't actually guarantee it — they quietly depend on whatever compiler version, system libraries, or environment variables happen to be present on the machine that ran the build, which is exactly how "works on my machine" bugs happen.

Hermeticity is what makes Blaze's other big feature, aggressive caching, safe. If a build target's inputs (source files, dependencies, build flags) haven't changed, Blaze can reuse a previously-built output rather than rebuilding, and because builds are hermetic, that cached output is provably identical to what a fresh build would produce. At Google's scale, this caching, extended to a distributed remote cache shared across the whole engineering organization, means most engineers' builds are mostly cache hits: someone else already built most of what you depend on, and you only pay the cost of building what actually changed.

## Explicit dependency declarations, not automatic discovery

Blaze and Bazel require every build target to explicitly declare its dependencies rather than letting the build system infer them by scanning source files for imports. This is more upfront work for engineers, but it gives the build system a precise, complete dependency graph it can use to parallelize builds aggressively, determine exactly what needs rebuilding after a change, and support tooling like large-scale automated refactoring that depends on knowing the dependency graph accurately rather than approximately. It also prevents a common failure mode in looser build systems, where code accidentally compiles because of an unintended, undeclared dependency that happens to be present in the build environment.

## From internal tool to industry standard

Google open-sourced a reimplementation of Blaze as Bazel in 2015, and it's since been adopted well beyond Google by companies with their own large, multi-language monorepos or multi-repo builds that need the same hermetic, cacheable, precisely-dependency-tracked properties. Its adoption outside Google is itself evidence that the problems Blaze solved weren't unique to Google's scale — they show up, in smaller form, anywhere a codebase and engineering organization grow past what ad hoc build scripts and Makefiles can comfortably handle.

## What you can borrow

- Hermetic builds — same inputs always produce the same output, regardless of machine — are the prerequisite for safe build caching; without hermeticity, caching just produces subtle bugs.
- Explicit dependency declarations cost more upfront but pay off heavily once you need reliable incremental builds or accurate large-scale refactoring tooling.
- A shared remote build cache across your whole engineering organization can turn most individual builds into cache hits, cutting build time dramatically at almost no cost to correctness.
- Build system investment scales in value with codebase and team size — it's reasonable for a small team to stay on simpler tools far longer than Google did.
- If you're already fighting flaky or environment-dependent builds, that's usually a sign hermeticity is missing, not that you need more caching.
