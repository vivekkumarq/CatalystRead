---
title: "Why DoorDash Rewrote Its Monolith in Kotlin, Not Go or Java"
slug: "doordash-python-monolith-kotlin-microservices-migration"
description: "As DoorDash broke apart its Python monolith, it picked Kotlin over Go and plain Java for the new microservices, and ran the cutover service by service."
publishedAt: "2025-05-20"
updatedAt: "2026-09-16"
category: "DoorDash"
tags:
  - Engineering at Scale
  - DoorDash
  - Kotlin
  - Microservices
  - Python
sources:
  - title: "DoorDash Engineering Blog"
    publisher: "DoorDash"
    url: "https://careers.doordash.com/blog"
---

DoorDash's original backend was a Python monolith built on Django, which served the company well while a small team owned most of the codebase. As the engineering org grew and the platform split into independently owned services, DoorDash faced a question every company in that position eventually hits: what language do the new services get written in? The answer wasn't Python again, and it wasn't the more obvious default of Go or straight Java either — DoorDash settled on Kotlin, and the reasoning behind that choice says as much about migrating a large engineering org as it does about language features.

## Why not just keep writing Python

Python had gotten DoorDash to a certain scale, but a dynamically typed language that's forgiving during a fast prototyping phase becomes a liability once hundreds of engineers are shipping changes to services that other services depend on. Type errors that would be caught at compile time in a statically typed language instead surface at runtime, often in production, and refactoring a large dynamically typed codebase safely is harder without a compiler backing you up. Moving to statically typed services was less about raw performance and more about giving a much larger engineering org the safety net a bigger, more distributed system needs.

## Why Kotlin over Go or Java

Java was the obvious statically typed, JVM-native choice, with a mature ecosystem of libraries and tooling DoorDash could lean on. Go was the trendier choice for infrastructure-heavy backend services elsewhere in the industry. DoorDash picked Kotlin instead, largely because it runs on the same JVM as Java and interoperates with it directly, so existing Java libraries and internal tooling didn't need to be thrown away or rewritten to adopt the new language. On top of that interoperability, Kotlin offered null-safety built into its type system, more concise syntax than Java, and coroutines for handling concurrent, asynchronous work — a pattern that felt closer to the async code patterns Python engineers were already used to, which lowered the learning curve for a team making the jump from a dynamically typed scripting language to a statically typed, JVM-based one.

```text
Old:  Python (Django) monolith
             |
New:  Kotlin microservices on the JVM
      - interoperates with existing Java libraries
      - null-safety at compile time
      - coroutines for async I/O
```

## Running the cutover service by service

DoorDash didn't attempt to rewrite the monolith wholesale. New services were built in Kotlin from the start, while existing monolith functionality was peeled off incrementally as it was extracted — the same phased, service-by-service approach DoorDash used for the broader microservices migration generally. This let teams learn Kotlin on smaller, lower-risk services first rather than being handed the entire platform's core logic on day one, and it meant the JVM interoperability wasn't just a nice property on paper — it was actively used, since some extracted services called into shared Java libraries the monolith era had already produced.

### The organizational payoff

Standardizing on one language for new backend services, rather than letting each team pick its own, also paid off in ways that had nothing to do with Kotlin's specific features: a single language meant shared tooling, shared code review norms, and engineers who could move between teams without a language switch on top of everything else they had to learn about a new service.

## What broke when they scaled

CPython's GIL and runtime characteristics were a real constraint on DoorDash's request-heavy logistics paths as traffic grew — not a moral failing of Python, which still runs a lot of the company. Their engineering posts on moving services to Kotlin cite JVM performance, coroutine-friendly concurrency, and null-safety versus Go's different error/concurrency model and versus Java's verbosity. Kotlin also sat well on the JVM hiring market and on existing Java libraries.

The cutover tax is dual stacks: Django still owns some domain while a Kotlin service owns dispatch. Network boundaries appear where there were function calls; you need idempotency, timeouts, and tracing that the monolith never required. A "rewrite everything in Kotlin" mandate would have stalled product work. They extracted service by service, often starting with the paths that were CPU- or concurrency-bound.

Kotlin on the JVM still has GC. It is a different GC than CPython's, not "no pauses." Tail latency still wants load tests at dinner-peak shapes.

## A smaller-team version of the same idea

Profile the monolith. Extract the one hot module as a service in a language your team can hire, with a strangler facade. Do not pick Kotlin because DoorDash did if you are a Go shop. Keep Python for glue and ML. Measure p99 before and after; language migrations fail when they are cultural and the graphs do not move.

## What you can borrow

- Choose a new language for a migration based on interoperability with what you already have, not just the language's own merits in isolation.
- Weigh how close a new language's idioms are to what your team already knows; a smaller learning curve speeds up a large-scale migration.
- Extract and rewrite incrementally, service by service, rather than committing to a single big-bang rewrite of a monolith.
- Standardizing on one language for new services pays organizational dividends — shared tooling and shared review norms — beyond the language's technical features.
