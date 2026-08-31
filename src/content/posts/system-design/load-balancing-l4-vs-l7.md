---
title: "Load Balancing Strategies: L4 vs. L7"
slug: "load-balancing-l4-vs-l7"
description: "Transport-layer and application-layer load balancers make routing decisions with very different visibility — here's what each one trades off."
publishedAt: "2025-07-07"
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
