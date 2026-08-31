---
title: "How WhatsApp Served Millions of Connections per Server With a Tiny Team"
slug: "whatsapp-erlang-millions-of-connections-per-server"
description: "How Erlang's lightweight process model and deep FreeBSD tuning let WhatsApp run hundreds of millions of users' traffic with a remarkably small team."
publishedAt: "2026-02-11"
category: "WhatsApp"
tags:
  - Engineering at Scale
  - WhatsApp
  - Erlang
  - Concurrency
---

By the time Facebook acquired WhatsApp in 2014, the company was serving several hundred million users with an engineering team that stayed strikingly small — often cited as only in the dozens of engineers, an outlier ratio in an industry where headcount usually scales roughly with user count. That outcome wasn't an accident; it was the product of deliberate technology and product choices that reduced how much engineering effort the system demanded in the first place.

## Erlang and lightweight processes

WhatsApp's backend was built primarily on Erlang, a language and runtime originally developed at Ericsson for telecom switching systems, where massive concurrency and fault tolerance were requirements from day one rather than nice-to-haves. Erlang's process model is central to why it fit WhatsApp's problem so well: Erlang processes are extremely lightweight, measured in kilobytes rather than the megabytes typical of OS threads, which meant a single machine could hold millions of concurrent, mostly-idle connections economically — with each user's persistent connection modeled naturally as its own isolated process. Thread-per-connection models common in other languages of that era simply couldn't reach that density on comparable hardware.

Erlang's OTP framework also contributed a fault-tolerance philosophy often summarized as "let it crash": rather than trying to defensively handle every possible error inline, processes are organized into supervision trees where a failed process is simply restarted by its supervisor, isolated from the rest of the system. Combined with Erlang's support for hot code upgrades — deploying new code without dropping existing connections — this gave WhatsApp both resilience and operational simplicity that would have been much harder to build from scratch on a more conventional stack.

## Pushing a single server further with FreeBSD tuning

Erlang's concurrency model alone wasn't sufficient — WhatsApp engineers, notably Rick Reed, have written and spoken about extensive low-level FreeBSD kernel tuning to push individual servers to millions of concurrent connections: adjusting network stack parameters, file descriptor limits, and interrupt handling well past typical out-of-the-box operating system defaults. This is the kind of unglamorous, deep systems work that rarely gets much attention but directly determined how many servers WhatsApp needed to run its entire global user base.

## Simplicity as a deliberate scaling strategy

WhatsApp's product philosophy reinforced the technical one. The company avoided building out a large feature surface for years — no ads, a famously minimal feature set — which meant there was simply less system to build, operate, and keep reliable. Combined with Erlang's built-in distribution and supervision, this let WhatsApp run at massive scale without needing a large operations or SRE organization to keep it healthy. Co-founders Jan Koum and Brian Acton were known for emphasizing this ethos of restraint, and it became a widely cited counterexample to the assumption that reaching hundreds of millions of users requires either a large headcount or constantly chasing the latest distributed-systems fashion.

## What you can borrow

- Pick a runtime whose concurrency model actually matches your workload's shape — many long-lived, mostly-idle connections is a specific pattern that thread-per-connection stacks handle poorly, regardless of raw hardware.
- Feature minimalism is itself a scaling strategy: every feature you don't build is a system you don't have to operate, debug, and keep online.
- Invest time in low-level OS and kernel tuning before assuming the answer to a capacity problem is simply more machines.
- Fault isolation patterns like supervision trees ("isolate and restart" rather than "handle every error inline") reduce how much defensive code you need to write and maintain.
