---
title: "OpenTelemetry Context Propagation: The W3C Header Is the Distributed Trace"
slug: "opentelemetry-context-propagation"
description: "traceparent, baggage, SDK propagators, and the one missing middleware that turns a mesh into a pile of orphan spans."
publishedAt: "2026-08-02"
category: "DevOps"
tags:
  - DevOps
  - OpenTelemetry
  - Tracing
  - Observability
sources:
  - title: "W3C Trace Context"
    publisher: "W3C"
    url: "https://www.w3.org/TR/trace-context/"
  - title: "OpenTelemetry Context propagation"
    publisher: "OpenTelemetry"
    url: "https://opentelemetry.io/docs/concepts/context-propagation/"
---

A trace is a tree only if every hop **propagates context**. OpenTelemetry stores span identity in a `Context`, and **propagators** inject it into HTTP headers, gRPC metadata, or messaging headers. The default for HTTP is W3C **Trace Context**: `traceparent` (`00-<trace-id>-<parent-id>-<flags>`) and optional `tracestate`. If one Spring filter, one nginx, or one Lambda forgets to forward `traceparent`, you get a new root span and a useless UI.

## Inject, extract, do not invent

Incoming request: `extract` headers into context, start a child span, make that context current. Outgoing request: `inject` the current context. SDKs do this in HTTP clients when you use the instrumented one. `RestTemplate` without the interceptor, a raw `java.net.http.HttpClient`, a JS `fetch` wrapper, and a Kafka producer without the propagator are the usual gaps.

```text
traceparent: 00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01
```

**Baggage** is a separate W3C header for key-value pairs you choose to propagate (tenant, experiment). It is not a secret channel. Every hop may log it. Do not put PII in baggage. Sampling flags in `traceparent` must stay consistent or a child may be recorded while the parent was dropped — backends differ in how they stitch that.

## Messaging and async

A thread pool must wrap `Context.current()` / `Scope` (Java) or `context.with()` (Python). Virtual threads still need the wrapper if you hop off the carrier incorrectly. Kafka: inject into record headers; consumers extract before processing. Losing context at a queue is the second most common break after HTTP.

Service meshes (Istio, Linkerd) may propagate trace headers for you **and** start their own spans. Align the propagator (W3C vs B3). Mixed B3 and W3C without a composite propagator is a coin flip per service.

## Testing

A contract test: send a `traceparent`, assert the outbound call reused the trace id. Chaos: drop the header, assert you **create** a new trace rather than crash. Sampling: 1% at the edge, not 1% independently at each service (that yields 1%^n).

Read the W3C spec's field definitions (they are short) and the OTel propagation conceptual docs. Then grep the repo for HTTP clients that are not the instrumented bean. The missing middleware is the missing trace.
