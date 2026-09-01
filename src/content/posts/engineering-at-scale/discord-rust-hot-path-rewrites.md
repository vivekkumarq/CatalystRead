---
title: "Where Discord Reached for Rust, and Why"
slug: "discord-rust-hot-path-rewrites"
description: "From swapping Go for Rust in the Read States service to speeding up Elixir's WebSocket handling, how Discord chose specific hot paths for a rewrite."
publishedAt: "2025-08-01"
category: "Discord"
tags:
  - Engineering at Scale
  - Discord
  - Rust
  - Performance
---

Discord's engineering culture has never treated any single language as sacred — Elixir runs the gateway, Python and Go have both been used for services, and over time Rust has quietly taken over a growing number of the system's hottest, most latency-sensitive paths. What's notable isn't that Discord uses Rust; it's how deliberately targeted the adoption was. Rather than a company-wide rewrite mandate, each move to Rust followed the same pattern: a specific service was identified as a garbage-collection or latency outlier through real production data, and Rust was brought in as a surgical fix for that specific bottleneck.

## The Read States service: Go's garbage collector under pressure

One of the clearest, most publicly documented examples was the Read States service — the component responsible for exactly the kind of per-user, per-channel "have you seen this message" bookkeeping that has to handle enormous request volume with low, predictable latency. Discord had originally built this service in Go, which served well for a long time, but as load grew the team started seeing periodic latency spikes that traced back to Go's garbage collector. The service's memory access pattern — large in-memory caches with a lot of churn — meant garbage collection pauses showed up as visible latency spikes at the tail, exactly the kind of behavior that's easy to miss in average-latency dashboards but painful in p99 numbers.

Rust's lack of a garbage collector, using ownership and borrowing checked at compile time instead of runtime GC, eliminated that entire class of latency spike by construction. Discord's engineers wrote candidly about the rewrite, noting that the memory safety guarantees Rust provided at compile time also meant the rewritten service avoided a category of bugs (use-after-free, data races) that would otherwise be a real risk when hand-optimizing a service this performance-sensitive.

```
Go service: steady latency, periodic GC-pause spikes at p99
Rust service: no GC pauses; latency variance driven by actual load, not collector behavior
```

## Speeding up Elixir at its own boundaries

Rust also found its way into Discord's Elixir-based gateway, not by replacing Elixir but by accelerating specific operations at its boundaries through native interoperability. Elixir's BEAM runtime is excellent for concurrency and fault isolation but isn't optimized for raw CPU-bound work like certain kinds of data encoding and serialization at high throughput. Discord used Rust, invoked from Elixir through native interfaces, to speed up hot operations in the gateway's data path — the kind of work where a tight, allocation-conscious native implementation meaningfully outperformed the general-purpose BEAM runtime doing the same computation.

This pattern — keep the orchestration and concurrency model in the language built for it, drop into Rust only for the specific CPU-bound inner loop — let Discord get the best of both without rewriting the whole gateway.

## Choosing rewrites with data, not dogma

What ties these examples together is that each one started from a concrete, measured production problem rather than a general belief that Rust is simply better. The Read States rewrite followed specifically from observed GC-driven tail latency; the Elixir acceleration followed from profiling that identified specific CPU-bound bottlenecks at the runtime's boundary. Discord's public engineering writing about these decisions consistently frames Rust as the right tool for a specific, identified job, not a wholesale platform migration — a discipline worth noting given how easy it is for a successful point rewrite to turn into pressure for an unjustified full rewrite elsewhere.

## What you can borrow

- Let production tail-latency data, not intuition, tell you where a garbage collector (or any runtime overhead) is actually costing you — GC pauses hide in averages and show up in p99/p999.
- A language rewrite doesn't have to be all-or-nothing — using a fast, safe systems language for just the CPU-bound inner loop of a system built in something else is a legitimate, lower-risk pattern.
- Memory safety guarantees checked at compile time matter more, not less, in exactly the highly optimized, hand-tuned code where GC-avoidance work would otherwise raise real risk of memory bugs.
- Treat each rewrite as a targeted response to a measured bottleneck — resist letting one successful rewrite become a mandate to rewrite everything else in the same language.
