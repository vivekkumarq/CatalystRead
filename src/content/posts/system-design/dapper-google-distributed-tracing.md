---
title: "Dapper: How Google Made Distributed Tracing Cheap Enough to Leave On"
slug: "dapper-google-distributed-tracing"
description: "Sigelman et al. on Dapper: trace trees, sampling, and the production constraints that still shape OpenTelemetry and Zipkin."
publishedAt: "2026-08-29"
category: "System Design"
tags:
  - System Design
  - Observability
  - Tracing
  - Google
sources:
  - title: "Dapper, a Large-Scale Distributed Systems Tracing Infrastructure"
    author: "Benjamin H. Sigelman et al."
    publisher: "Google Technical Report, 2010"
    url: "https://research.google/pubs/pub36356/"
  - title: "OpenTelemetry Tracing specification"
    publisher: "OpenTelemetry"
    url: "https://opentelemetry.io/docs/specs/otel/trace/"
---

Before every microservice demo shipped a flame graph, Google's Dapper paper (Sigelman, Barroso, Burrows, Stephenson, Plakal, Beaver, Jaspan, Shanbhag) documented how to trace production RPCs without drowning the fleet. The constraints still apply: tracing must have **low overhead**, require **almost no application changes**, and remain **useful under sampling**.

## A tree of spans, not a log dump

A **trace** is a tree. Each **span** records a named operation, timestamps, and parent identity. The trace id travels with the RPC — in Dapper's world, through Google's RPC layer — so a frontend request, a handful of backends, and a Bigtable read become one reconstructable tree. Annotations (binary or text) attach to spans without forcing a new schema per team.

The important design choice is **out-of-band collection**. Spans are written locally and harvested asynchronously. The request path does not wait on the tracing backend. If your tracer does a network call on the critical path to "export immediately," you have invented a new outage mode Dapper explicitly avoided.

```text
trace 8f3a…
  span frontend.Handle   12ms
    span ads.Lookup      4ms
    span store.Get       7ms
      span bigtable.Read 5ms
```

## Sampling is a product feature

Dapper sampled a small fraction of requests, on the order of 1 in 1,000 for high-QPS services, with adaptive sampling later. Engineers fear sampling because they imagine missing the one bad request. In practice, high-QPS services produce so many traces that rare error classes still appear, and you can raise the sample rate for a canary or an error-only policy. Unsampled, 100% tracing at Google scale would have been a storage and CPU tax larger than the value of pretty pictures.

The paper also warns that **median latency lies**. A sampled trace of a slow request is worth more than a million fast ones. That is why later systems add tail-based sampling: keep the slow and the failed, drop the boring. Dapper's core insight remains: default to cheap, then spend budget where the questions are.

## Almost no application changes

Dapper hooked the common RPC and threading libraries. Thread-local context followed the request across thread pools. That is the same bet OpenTelemetry makes with instrumentation libraries. If every team must remember to pass `trace_id` as a method argument, you will not have traces in the services that page you.

What Dapper does not give you: a substitute for metrics. Traces explain a single request. Metrics tell you the rate. Logs give you payload. Teams that "just use traces" for SLOs discover they cannot compute availability from a 0.1% sample without pain.

If you are adopting tracing in 2026, steal Dapper's three tests. Is context propagation automatic on your RPC framework? Is export asynchronous with backpressure that drops spans instead of stalling users? Is sampling a control you can change without a redeploy? Fail those and you have a demo, not Dapper.

Read the report's overhead numbers once. Then look at your agent's CPU. If tracing shows up next to gzip on the profile, you sampled too late or exported too eagerly.
