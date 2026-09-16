---
title: "Pingora: Retiring NGINX for a Rust Proxy Framework"
slug: "cloudflare-pingora-replacing-nginx-with-rust"
description: "How Cloudflare replaced its NGINX-based proxy layer with Pingora, a Rust framework built for memory safety and lower resource use at edge scale."
publishedAt: "2025-07-22"
updatedAt: "2026-09-16"
category: "Cloudflare"
tags:
  - Engineering at Scale
  - Cloudflare
  - Rust
  - Networking
  - Proxy
sources:
  - title: "Pingora: A New Proxy That Connects Cloudflare's Users to the Internet"
    publisher: "Cloudflare Blog"
    url: "https://blog.cloudflare.com"
---

For most of its life, Cloudflare's edge ran on NGINX, patched and extended with a large body of internal Lua and C modules. NGINX had served the company well for a decade, but at Cloudflare's scale — tens of millions of requests per second across a fleet handling a meaningful share of global HTTP traffic — the accumulated weight of that customization started to show. NGINX's request-processing model was built around a phase-based architecture that made some kinds of connection reuse and error handling awkward, its C codebase carried the usual memory-safety risks of C, and years of internal patches made every upgrade a bigger undertaking than it should have been.

## Why not just keep patching

The team's internal accounting found that a large share of their production incidents traced back to memory-safety bugs of the kind that C makes easy to write and hard to catch before deploy: use-after-free, buffer overruns, null pointer dereferences. NGINX's architecture also made it expensive to do what Cloudflare increasingly needed — hold a connection to an origin open and reuse it efficiently across many different downstream client requests, rather than the more traditional connection-per-request model. Patching around these limits indefinitely was possible, but each patch added more surface area to an already sprawling fork of someone else's codebase.

## Building Pingora

Cloudflare's answer was Pingora, a proxy framework written from scratch in Rust and open-sourced after years of internal production use. Rust's ownership model eliminates whole categories of memory-safety bugs at compile time, without needing a garbage collector — a meaningful property for software sitting directly in the hot path of every request. Pingora was designed around connection pooling as a first-class feature, letting Cloudflare multiplex many client requests over a smaller number of long-lived, reused connections to origin servers, cutting TCP and TLS handshake overhead at the scale of billions of daily requests.

Pingora is not a drop-in NGINX replacement in the config-file sense — it's a Rust framework/library that Cloudflare and others use to build proxies, giving engineers programmatic control over request handling rather than expressing everything through NGINX's directive-and-module system. That let Cloudflare's team express complex routing and failover logic as ordinary Rust code with the compiler checking it, instead of composing Lua scripts around NGINX's phases.

## The migration

Rolling out a from-scratch replacement for the software sitting between the internet and a huge portion of Cloudflare's customer traffic required extreme caution: the team moved service by service, comparing Pingora's behavior against the existing NGINX layer under real production load before cutting traffic over, watching for subtle differences in header handling, timeout behavior, and edge-case error responses that could break customer configurations built over years around NGINX quirks. Cloudflare has reported that the migration delivered lower CPU and memory usage per request alongside the elimination of the memory-safety bug class entirely, once the majority of production HTTP traffic moved onto it.

## What broke when they scaled

NGINX plus years of Lua/C modules becomes a private fork. Upstream upgrades merge like archaeology; a CVE in a module you barely remember still sits in the request path. Cloudflare's public Pingora posts cited memory-safety incidents as a large share of production pain — the class of bug C makes routine. At tens of millions of RPS, even rare use-after-frees are a weekly event somewhere in the fleet.

Connection semantics also fought the old process model. Cloudflare needed to reuse origin connections across many clients (HTTP/2, keepalive, coalescing) in ways that NGINX's phase machine made clumsy. Each extra handshake at this scale is real origin load and real latency. Pingora's design treats pooling as a first-class loop, not a module bolted onto a server that assumed short requests.

The migration risk was protocol fidelity. Customers had accumulated dependencies on NGINX's header canonicalization, timeout defaults, and error pages. A "faster proxy" that alters `Transfer-Encoding` handling is an incident. Cloudflare's cutover compared behaviors under live traffic, service by service — the only way to retire a proxy that had become the de facto HTTP spec for a chunk of the web.

## A smaller-team version of the same idea

If your edge is stock NGINX with a few Lua scripts and no multi-tenant nightmare, keep it. Add keepalive and an upstream pool before you rewrite. If you are writing substantial C in the request path, or you cannot upgrade because of a fork, consider a memory-safe proxy (Pingora is open source; Envoy is another mature option) for *new* paths first. Shadow traffic. Diff status codes and a sample of headers. Do not rewrite because Rust is fashionable.

## What you can borrow

- A rewrite is justified when the incident data points at a specific, structural class of bug (here, memory safety) that patching the existing system can only ever partially address.
- Connection reuse and pooling are cheap wins at scale that are easy to underinvest in when working within an existing framework's constraints.
- Choosing a memory-safe systems language for code sitting directly in the request path removes a category of production incidents before they can happen, not just after.
- Stage a foundational infrastructure rewrite behind careful, service-by-service comparison against the system it replaces — don't cut over on trust alone.
- Open-sourcing infrastructure you built for your own scale can validate its design against a wider set of use cases than your own traffic alone.
