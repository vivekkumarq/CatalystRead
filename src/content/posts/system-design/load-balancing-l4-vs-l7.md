---
title: "Load Balancing Strategies: L4 vs. L7"
slug: "load-balancing-l4-vs-l7"
description: "Transport-layer and application-layer load balancers make routing decisions with very different visibility — here's what each one trades off."
publishedAt: "2025-07-07"
updatedAt: "2026-09-16"
category: "System Design"
tags:
  - System Design
  - Networking
  - Scalability
  - Backend Engineering
---

"Load balancer" hides two genuinely different devices behind one name, operating at different layers of the stack with different visibility into the traffic they're routing. Picking between them is really a question of how much you need the balancer to understand about what it's forwarding.

## Layer 4: Routing on Connection Info Alone

An L4 load balancer works at the transport layer — it sees IP addresses and TCP/UDP ports, and makes a routing decision once, at connection setup, then forwards packets for the life of that connection without inspecting them.

```text
Client ---TCP SYN---> L4 LB ---picks backend by hash(src_ip,src_port)---> Backend
Client <--------------------- all subsequent packets on this connection -->
```

This is fast — no parsing of HTTP, no TLS termination in most setups — and protocol-agnostic, which is why it's the right layer for raw TCP services, database proxies, or anything that isn't HTTP. Its blind spot is exactly its strength: it cannot route based on URL path, headers, or cookies, because it never looks at them.

## Layer 7: Routing on the Actual Request

An L7 load balancer terminates the connection, parses the application-layer request, and can route based on its content — path, host header, cookie, method — before opening a new connection to the chosen backend.

```yaml
# Example: path-based routing, the defining L7 capability
rules:
  - path: /api/orders/*
    backend: orders-service
  - path: /api/search/*
    backend: search-service
  - host: admin.example.com
    backend: admin-service
```

This is what makes a single load balancer usable as an API gateway: one entry point fanning out to many services by URL, doing TLS termination, header injection, and request-level retries in one place. The cost is real: terminating and re-establishing connections, parsing HTTP, and, for HTTPS, decrypting and re-encrypting all add latency and CPU that L4 never pays.

## Where They Actually Differ in Practice

| | L4 | L7 |
| - | -- | -- |
| Sees | IP + port | Full request (path, headers, cookies) |
| Routing granularity | Per-connection | Per-request |
| TLS | Usually passthrough | Usually terminates |
| Latency overhead | Minimal | Higher (parsing, possible re-encryption) |
| Fits | Raw TCP, databases, non-HTTP protocols | HTTP/gRPC microservices, API gateways |

A detail that trips people up: because L4 routes per-*connection*, not per-request, a single long-lived connection (a WebSocket, a persistent gRPC channel) stays pinned to one backend for its whole lifetime, which is exactly what you want for stateful streams and exactly what breaks round-robin fairness for connection-pooled HTTP clients that only open one connection and send thousands of requests over it.

## The Common Real Setup

Production systems frequently run both, layered: an L4 balancer at the edge for raw throughput and DDoS absorption, handing off to L7 balancers or a service mesh sidecar for the actual application routing, retries, and observability. Treat the choice as "what does the next hop need to know about this traffic to route it correctly" — if the answer is just "which healthy backend," stay at L4 and keep the latency; if the answer involves the request's content, you need L7 and the cost that comes with it.

## A worked example

L4 (TCP/UDP) NLB spreads connections; TLS may terminate later. L7 HTTP LB routes `/api` vs `/images`, drains with 503, sticky cookies if you must. Health checks: L4 SYN vs L7 GET `/health`. You pick L4 for raw throughput and unknown protocols; L7 for HTTP routing and WAF.

A gRPC service: L7 HTTP/2 aware LB or you break streams.

## Failure modes

L4 health up while the HTTP app is wedged. Sticky sessions hiding a stateful bug. L7 buffering killing websockets. Idle timeouts shorter than the app. TLS origination that does not verify upstream. Uneven least-conn with long-lived conns.

DNS round-robin as the only LB with no health.

## When this is the wrong tool

A single instance does not need an LB. L7 is the wrong tool for non-HTTP protocols unless you understand the parser. Client-side LB (gRPC) can replace a proxy in a mesh — do not stack four LBs. Global anycast vs regional LB is a product/latency choice, not a layer-4 vs 7 quiz. Do not use the LB as an app firewall for authz logic that belongs in the service.

## A worked failure mode

L4 balancing with a long-lived connection pins a user to a dying node. L7 balancing terminates TLS and the cert is forgotten. Health checks hit `/` while `/ready` is false. The failure is layer choice without connection and health semantics. Use L7 when you need HTTP awareness; drain connections; health-check readiness.

L7 is the wrong tool for non-HTTP protocols you should pass through. L4 sticky is the wrong HA. Pick the layer that matches the protocol and drain.

Treat the counterexample as part of the spec. Someone will apply "Load Balancing Strategies: L4 vs. L7" to a problem that only looks similar at the noun level—same words, different constraints. Require a one-page fit check: scale, consistency, failure domains, and who is on call. If two of those are guesses, run a spike, not a rewrite. The expensive bugs are not the ones in the happy-path tutorial; they are the ones where the tutorial's silent assumptions were load-bearing.
