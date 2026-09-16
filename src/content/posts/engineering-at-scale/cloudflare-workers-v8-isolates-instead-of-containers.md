---
title: "Workers and the Bet Against Containers"
slug: "cloudflare-workers-v8-isolates-instead-of-containers"
description: "Why Cloudflare built its serverless platform on V8 isolates rather than containers or VMs, and what that architectural choice buys in cold-start latency."
publishedAt: "2025-06-03"
updatedAt: "2026-09-16"
category: "Cloudflare"
tags:
  - Engineering at Scale
  - Cloudflare
  - Workers
  - V8
  - Serverless
sources:
  - title: "Cloudflare Workers: A Polyglot Runtime for Web-scale Serverless Computing"
    publisher: "Cloudflare Blog"
    url: "https://blog.cloudflare.com"
  - title: "How Cloudflare's Architecture Allows Us to Scale to Stop Huge Attacks"
    publisher: "Cloudflare Blog"
    url: "https://blog.cloudflare.com"
---

When Cloudflare set out to let customers run their own code at the edge, the obvious playbook was already written: spin up a container per customer, or a lightweight VM, the way most serverless platforms did in the mid-2010s. The problem was cost and speed. Containers take tens to hundreds of milliseconds to start, and a VM is heavier still. Cloudflare's edge needed to run arbitrary customer code in hundreds of cities, for potentially millions of tenants, with the code starting fast enough that the isolation overhead never shows up in the request path. That ruled out the standard toolkit.

## Isolates, not containers

Workers instead runs each piece of customer code as a V8 isolate — the same lightweight sandboxing primitive that Chrome uses to keep browser tabs from touching each other's memory. An isolate is not an operating system process. It has no separate kernel, no virtualized network stack, and no filesystem of its own. It's a JavaScript execution context with its own heap and global object, created directly inside a single running process. Because there is no OS boot and no container image to unpack, an isolate can be created in low single-digit milliseconds, and a single Cloudflare edge server can hold thousands of them in memory at once — several orders of magnitude more density than a process- or VM-based model would allow.

This changes the economics of the platform in a specific way: instead of pre-warming instances and paying for idle capacity to hide cold starts, Cloudflare can create isolates on demand, close to the request, and still land inside the latency budget of a normal HTTP round trip. Workers deliberately gave up some things to get there — no arbitrary binary execution, no shelling out to the OS — in exchange for a runtime that starts fast enough to be invisible.

## The V8 platform underneath

Because isolates share a V8 engine and OS process, Cloudflare had to build strict boundaries around memory, CPU time, and API surface so that one tenant's Worker can never see another's heap or starve the machine of cycles. The runtime exposes a constrained set of Web-standard APIs (fetch, streams, crypto) rather than Node's full standard library, which keeps the platform's attack surface small and its behavior predictable across the fleet. Workers also compiles and runs WebAssembly through the same isolate model, so languages that compile to Wasm — Rust and others — get the same startup characteristics as JavaScript.

The tradeoff surfaces most clearly in what Workers doesn't do well: long-running background jobs, heavy in-memory state, or workloads that genuinely need a full OS. Cloudflare's newer container offering exists precisely to complement Workers for that class of problem, rather than to replace it — isolates remain the default because most edge logic (auth checks, redirects, A/B routing, small transformations) is short-lived and latency-sensitive, exactly the case isolates were built for.

## Why this mattered beyond Cloudflare

The isolate approach also reframed a debate the industry was having about serverless cold starts. AWS Lambda and similar platforms were built around container or micro-VM isolation (Firecracker), which is a reasonable choice for longer-running, more privileged functions, but it structurally can't match isolate-level startup times. Workers proved that a shared-process, memory-safe sandbox could run untrusted multi-tenant code safely at a density and speed that container-based systems could not reach, which is part of why isolate-style runtimes later showed up elsewhere in the industry.

## What broke when they scaled

Shared-process multi-tenancy means one V8 bug or one runaway isolate is a host problem. Cloudflare's isolate bet depends on V8's security track record, tight CPU accounting, and an API that cannot `mmap` a neighbor's heap. As Workers gained Durable Objects, streams, and more I/O, the runtime had to grow without becoming Node — each new host capability is a new attack surface. CPU limits and I/O wait are different resources; a Worker that is "idle" on fetch can still pin event-loop capacity.

Cold starts stay small only if the script is small and V8 snapshots help. Giant bundles, huge WASM modules, or first-request JIT can push isolate creation out of the "invisible" budget. Platform features like preload and isolate reuse exist because naive spawn-per-request does not survive a stampede.

The industry comparison to Lambda/Firecracker is not "Workers won." Long-running jobs, native addons, and arbitrary binaries still want a VM or container — which is why Cloudflare later added containers alongside Workers rather than stretching isolates into a general OS.

## A smaller-team version of the same idea

For request-scoped logic at the edge (auth, redirects, header rewrites), a Worker-like isolate or a simple proxy script beats a container per tenant. Constrain the API. Time-box CPU. If you need a compiler or a GPU, do not fake it with V8. On a single-tenant backend, ordinary processes are fine; isolates shine when you multiplex untrusted code onto one box and care about milliseconds of start time.

## What you can borrow

- Match the isolation primitive to the workload: heavyweight VM or container isolation is the right default for long-running or highly privileged code, but short, stateless request handlers rarely need it.
- Cold-start latency is often the real constraint on a platform's usefulness, not raw throughput — measure and design for the tail, not just the average.
- A constrained API surface (standard Web APIs instead of a full OS-level runtime) is a legitimate way to shrink both attack surface and cold-start cost simultaneously.
- Don't force one runtime to do everything; pairing a fast, restricted runtime with a separate, heavier option for edge cases beats compromising the fast path.
