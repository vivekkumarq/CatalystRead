---
title: "The Three Pillars of Observability, and Where They Actually Overlap"
slug: "three-pillars-of-observability"
description: "Logs, metrics, and traces are usually taught as separate pillars, but the real value comes from how they connect during an actual incident investigation."
publishedAt: "2025-12-22"
category: "DevOps"
tags:
  - Observability
  - DevOps
  - Monitoring
  - Infrastructure
---

"Three pillars of observability" is a tidy phrase that undersells how much these three data types depend on each other in practice. Logs, metrics, and traces each answer a different question well and answer the other two questions poorly, and an incident investigation almost never stays inside one pillar — it moves between them, using one to narrow down where to look in the next.

## Metrics: fast, cheap, and blind to specifics

Metrics are numeric time series — request rate, error count, p99 latency — aggregated over time windows. They're cheap to store and query even at high cardinality-limited scale, and they're what dashboards and alerts are built on because a threshold crossing is easy to detect automatically:

```
http_requests_total{service="checkout", status="500"} 1284
http_request_duration_seconds{service="checkout", quantile="0.99"} 2.4
```

The limitation is specificity: a metric tells you error rate spiked at 14:32, not which specific requests failed or why. Metrics are the "something is wrong" signal, rarely the "here's exactly what's wrong" signal.

## Logs: detail without structure, unless you enforce it

Logs carry the specific detail metrics can't — a stack trace, a request ID, the exact payload that triggered a failure. Unstructured logs are searchable but not reliably queryable; structured (JSON) logs fix that at the cost of discipline:

```json
{"timestamp":"2025-12-22T14:32:11Z","level":"error","service":"checkout","trace_id":"a1b2c3","message":"payment gateway timeout","order_id":"ord_9f21"}
```

The `trace_id` field is the detail that matters most here — it's the bridge to the next pillar. Without a consistent correlation ID propagated through every log line for a given request, logs stay isolated per-service, and reconstructing a multi-service failure means manually cross-referencing timestamps across systems, which is slow and error-prone under incident pressure.

## Traces: the pillar that actually shows causality

A distributed trace follows one request across every service it touches, showing not just that checkout failed but that it failed because the payment gateway call inside it took 4.8 seconds and timed out, while the inventory check three spans earlier was fine. That causal chain is something neither logs nor metrics show on their own:

```
checkout-api (120ms)
  └─ inventory-service (18ms)
  └─ payment-gateway (4800ms) ← timeout here
       └─ fraud-check (40ms)
```

Traces require instrumentation discipline — every service in the request path needs to propagate trace context (typically via W3C Trace Context headers) and emit spans — which is why traces are usually the last pillar teams adopt, even though they're often the fastest path to root cause once in place.

## Where the real value is: correlation, not collection

Having all three pillars deployed independently is a partial win. The larger win is when they're linked: a metric alert fires, the on-call engineer clicks through to the exact time window and service, pulls the trace for a representative failing request from that window, and jumps straight to the specific log lines tagged with that trace's ID. That workflow — metric to trace to log — is what turns a 45-minute investigation into a five-minute one.

```yaml
# Example: exemplar linking in Prometheus/OpenTelemetry setups
# lets a metric spike carry a sample trace_id directly
http_request_duration_seconds_bucket{le="5"} 842 # trace_id="a1b2c3"
```

Exemplars — trace IDs attached directly to metric samples — are a small feature that makes this correlation nearly automatic instead of requiring the engineer to manually guess a time window and search for a matching trace. If your observability stack has all three pillars deployed but no shared identifiers linking them, you don't yet have observability — you have three separate dashboards that happen to describe the same system.
