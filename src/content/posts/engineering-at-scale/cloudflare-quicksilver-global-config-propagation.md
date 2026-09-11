---
title: "Quicksilver: Pushing Config to Every Edge Location in Seconds"
slug: "cloudflare-quicksilver-global-config-propagation"
description: "Inside Quicksilver, the distributed key-value store Cloudflare built to propagate configuration changes worldwide in seconds instead of minutes."
publishedAt: "2025-05-14"
category: "Cloudflare"
tags:
  - Engineering at Scale
  - Cloudflare
  - Distributed Systems
  - Key-Value Store
sources:
  - title: "Quicksilver: Configuration Distribution at Internet Scale"
    publisher: "Cloudflare Blog"
    url: "https://blog.cloudflare.com"
---

Every time a Cloudflare customer changes a DNS record, updates a firewall rule, or flips a feature on for their zone, that change has to reach every one of Cloudflare's edge data centers around the world — and it has to get there fast, because a slow propagation window is a window where different visitors to the same site see different, inconsistent behavior. Cloudflare's original configuration store, built on Kyoto Tycoon, could take on the order of minutes to fully propagate a change globally. As the number of customers, zones, and configurable settings grew, that latency became both a product limitation and an operational risk: minutes-long propagation is minutes-long exposure when the change in question is an emergency firewall rule blocking an active attack.

## Designing for read-heavy, globally distributed access

The workload Cloudflare needed to serve is heavily skewed: writes are relatively rare (a customer changing a setting) but reads are constant and enormous, since every single HTTP request touching Cloudflare's network needs to look up the relevant configuration for that zone. That access pattern ruled out a lot of conventional distributed-database designs built around strong write consistency, and pointed instead toward a system optimized for extremely fast, highly available local reads, with writes propagated asynchronously in the background.

Quicksilver is the key-value store Cloudflare built for this. Every edge server keeps a local, complete replica of the configuration data it needs, so a read never has to leave the machine, let alone cross a network to a central database. Writes originate centrally and are fanned out to every location using a change-propagation mechanism designed to reach the whole fleet in seconds rather than minutes — a roughly two-orders-of-magnitude improvement over the system it replaced.

## Trading strict consistency for availability and speed

Quicksilver is built around eventual consistency: an edge location might briefly serve a slightly stale value while a change is still propagating, rather than blocking reads to guarantee every location is perfectly in sync at every instant. For Cloudflare's use case this is the right tradeoff — a firewall rule reaching Sydney a couple of seconds after it reaches London is a far smaller problem than a design where any edge location can become unavailable for reads because it's waiting on write consensus. The local-replica design also means Quicksilver reads survive network partitions between edge locations and the core; a data center that gets cut off from the rest of Cloudflare's network keeps serving requests with whatever configuration it last received, rather than failing open or failing closed for lack of connectivity.

## Why this shaped the rest of the platform

Quicksilver became a piece of shared infrastructure well beyond its original DNS-and-firewall use case — it's the same propagation mechanism underneath Cloudflare Workers' configuration, rate-limiting rules, and other features that need to reach every edge location quickly and reliably. Building one well-understood system for "get this piece of data everywhere, fast" let product teams building new edge features reuse it rather than each inventing their own propagation mechanism, which is as much an organizational win as a technical one.

## What you can borrow

- Design your storage system around your actual read/write ratio, not a generic one — a 1000:1 read-heavy workload deserves a fundamentally different architecture than a balanced one.
- Eventual consistency is a legitimate, deliberate choice when brief staleness is cheap and unavailability is expensive — don't default to strong consistency out of habit.
- Full local replicas eliminate network calls from the read path entirely, which is a more resilient design than caching with fallback to a remote source.
- A well-built internal system for a narrow original problem (config propagation) is worth generalizing into shared infrastructure once other teams have the same underlying need.
