---
title: "Why Discord's Gateway Runs on Elixir and the BEAM"
slug: "discord-elixir-beam-gateway"
description: "How the Erlang VM's lightweight process model and fault isolation made Elixir the right fit for Discord's connection-heavy real-time gateway."
publishedAt: "2025-06-10"
category: "Discord"
tags:
  - Engineering at Scale
  - Discord
  - Elixir
  - Real-Time Systems
---

Discord's core problem is holding open millions of persistent WebSocket connections simultaneously — one per connected client — and pushing events (messages, presence updates, typing indicators) to exactly the right set of connections the moment something happens. That's a workload defined by massive concurrency rather than raw computational intensity: most of the work is bookkeeping and message routing per connection, not heavy per-request computation. When Discord's founders were choosing a language for the gateway — the service layer that actually holds those client connections — they picked Elixir, a language built on the Erlang VM (the BEAM), specifically because the BEAM was designed from its telecom origins for exactly this kind of massively concurrent, long-lived-connection workload.

## Lightweight processes instead of OS threads

The BEAM's defining feature is its process model: an Elixir (or Erlang) process is not an OS thread, it's a lightweight, independently scheduled, garbage-collected unit that the VM can create by the millions with a tiny memory footprint each — a few kilobytes rather than the megabyte-scale stacks OS threads typically require. That made it practical for Discord to model each connected client, or each guild (server), as its own isolated process, rather than trying to multiplex millions of logical connections through a much smaller pool of OS threads with shared state and the locking complexity that implies.

Because BEAM processes share no memory and communicate only by passing messages, a huge class of concurrency bugs — race conditions on shared mutable state — simply doesn't arise the way it does in shared-memory threading models. Each process manages its own state and reacts to messages sequentially, which made reasoning about correctness for a given connection's behavior far simpler even as the total number of concurrent connections scaled into the millions.

```
client connection --> dedicated BEAM process (isolated state, mailbox)
     ...                          ...
client connection --> dedicated BEAM process (isolated state, mailbox)
```

## "Let it crash" as a reliability strategy

Erlang's philosophy, inherited by Elixir, embraces the idea that individual process failures are normal and should be handled by supervision rather than defensive programming everywhere. Under Discord's supervision trees, if a single process handling one client's connection hits an unexpected error, it can simply crash and be restarted cleanly by its supervisor, without taking down the process handling any other client's connection or any shared server state. This isolation meant a bug affecting one connection's edge case degraded to a single reconnect for one user rather than risking a wider outage — a very different failure mode than a shared-memory service where one bad connection's corrupted state can bring down everything sharing that memory.

## Hitting scaling limits and mixing in Rust

The BEAM's process model bought Discord enormous concurrency headroom, but it isn't a universal answer to every performance problem — Elixir's garbage collector and general-purpose runtime aren't optimized for the kind of raw CPU-bound throughput some hot paths eventually demanded as Discord's traffic grew into the billions of messages. Rather than abandoning Elixir for the gateway wholesale, Discord's engineers identified the specific bottlenecks empirically and addressed them by dropping down to Rust for particular hot-path components (a pattern covered in more detail elsewhere in Discord's engineering writing), while keeping Elixir and the BEAM as the backbone for connection management and the supervision architecture that made the whole system resilient.

## What you can borrow

- For workloads defined by massive concurrency rather than raw compute — many long-lived connections doing modest per-connection work — a lightweight-process runtime can beat a thread-per-connection or event-loop model built for different assumptions.
- Isolating state per unit of work (per connection, per session) so failures can't cascade is worth the architectural discipline, whatever language or runtime you're using.
- "Let it crash" plus supervision is a legitimate reliability strategy — the goal isn't zero failures, it's making individual failures cheap and automatically recoverable.
- Choosing a language for its concurrency model doesn't require it to be the best choice for every hot path — profile empirically and mix in a different tool where it genuinely pays off.
