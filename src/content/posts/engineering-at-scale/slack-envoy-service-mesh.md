---
title: "Standardizing on Envoy: How Slack Tamed Service-to-Service Traffic"
slug: "slack-envoy-service-mesh"
description: "Why Slack adopted Envoy as a common proxy layer for internal service traffic, replacing a patchwork of per-service networking logic."
publishedAt: "2026-02-11"
updatedAt: "2026-09-16"
category: "Slack"
tags:
  - Engineering at Scale
  - Slack
  - Envoy
  - Service Mesh
  - Microservices
sources:
  - title: "Slack Engineering Blog"
    publisher: "Slack"
    url: "https://slack.engineering"
  - title: "Envoy Proxy"
    author: "Matt Klein"
    publisher: "CNCF"
    url: "https://www.envoyproxy.io"
---

As Slack's backend grew from a smaller set of services into a much larger collection of independently deployed ones, the logic governing how those services talked to each other — retries, timeouts, load balancing, circuit breaking, observability — had accumulated unevenly across the codebase. Some of it lived in shared libraries, some was reimplemented per service, and some existed only as informal convention that different teams applied inconsistently. That's a common and quietly dangerous state for a growing services architecture to be in: it works until a service with slightly different retry behavior or a missing timeout turns a routine dependency hiccup into an incident, and diagnosing why requires reading the specific networking code of whichever service happens to be misbehaving that day.

## The cost of per-service networking logic

The core problem with letting every service own its own networking behavior isn't any single service getting it wrong — it's that a large organization inevitably ends up with dozens of subtly different implementations of the same handful of concerns, each with its own bugs and its own blind spots. A change to retry policy or a new requirement for consistent distributed tracing meant touching every service individually, in whatever language and framework that service happened to use, rather than making the change once. That kind of duplicated, drifting logic is exactly the pattern that a service mesh is designed to eliminate.

## Envoy as the common data plane

Envoy is a high-performance proxy, originally built at Lyft and later donated to the CNCF, designed to sit alongside each service instance and handle exactly this class of concern: routing, load balancing, retries and timeouts, circuit breaking, and rich observability into every request that flows through it, all configured consistently rather than reimplemented per service. Slack's adoption of Envoy as a standard proxy layer for internal service-to-service traffic meant that networking behavior stopped being something every team had to get right independently, and became infrastructure that the platform team could own, configure, and evolve centrally.

```text
service A --> Envoy sidecar --> Envoy sidecar --> service B
                 (retries, LB,       (same policy,
                  timeouts,           enforced once,
                  observability)      not per-service)
```

Because Envoy sits at the network layer rather than inside application code, it works the same way regardless of which language or framework a given service is written in — a meaningful property for an organization where services don't all share one stack. Deploying it as a sidecar alongside each service, rather than as a shared central proxy tier, also meant a single Envoy instance failing affected only its own service rather than creating a shared point of failure for everything routing through a central hop.

## Getting the observability payoff

One of the most immediately valuable side effects of standardizing on a common proxy layer is what it does for visibility: with every service-to-service call passing through Envoy, Slack gained consistent metrics, logging, and tracing for internal traffic without needing every team to separately instrument their own service for it. That uniform data made it dramatically easier to see where latency was actually coming from across a call chain spanning many services, instead of piecing together partial, inconsistently-instrumented signals from whichever services happened to have good internal observability already.

## What a mid-size team can steal from Slack's mesh

Envoy at Slack is about uniform timeouts, retries, TLS, and observability between services without every language rewriting that stack. Mid-size steal: a sidecar or a shared HTTP client library with those defaults, before a full mesh. Meshes fail when they become a second network nobody understands.

The concrete failure mode is retry amplification through the mesh: Envoy retries, the app retries, the gateway retries, and a slow dependency is now at 9x load. Set retry budgets and idempotency. Operational gotcha: a control-plane push that reloads all proxies and drops connections, which for Slack-like systems means a reconnect storm. Stage config. Another is mTLS that breaks a debug path or a data-plane job that was not in the identity catalog. Inventory every caller. Slack's size justifies a dedicated mesh team. A 30-person backend org may get 80% of the value from a gateway plus client defaults plus tracing. If you do adopt Envoy, treat the bootstrap config as production code, with tests that fail if a service has no timeout. Watch outlier detection: it can eject healthy pods during a brief GC pause and shrink capacity. Mesh metrics should be the first pane in the incident, or you added a hop you cannot see.

## What you can borrow

- When networking concerns (retries, timeouts, load balancing) are reimplemented per service, treat that duplication itself as a reliability risk, not just an efficiency loss — inconsistent behavior across services is where cross-service incidents come from.
- A sidecar proxy model lets you standardize networking behavior across services written in different languages and frameworks without asking every team to adopt a shared library.
- The observability payoff of a common proxy layer is often as valuable as the reliability payoff — uniform tracing and metrics across all internal traffic beats piecing together whatever instrumentation each service happened to have.
- Prefer a per-instance sidecar deployment over a shared central proxy tier where you can — it keeps a single proxy failure scoped to one service instead of creating a new single point of failure for everything.
