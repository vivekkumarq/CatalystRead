---
title: "Toxiproxy: Shopify's Tool for Breaking the Network on Purpose"
slug: "shopify-toxiproxy-network-resilience-testing"
description: "How Shopify built Toxiproxy to deliberately simulate latency, timeouts, and bandwidth limits so engineers could test resilience before production did."
publishedAt: "2026-02-25"
updatedAt: "2026-09-16"
category: "Shopify"
tags:
  - Engineering at Scale
  - Shopify
  - Reliability
  - Chaos Engineering
sources:
  - title: "Shopify Engineering Blog"
    publisher: "Shopify"
    url: "https://shopify.engineering"
---

A distributed system eventually meets a slow database connection, a stalled network link, or a dependency that just stops responding, and the code path that handles that failure is usually the least-tested part of the whole application — because reproducing it on demand is hard. You can't easily tell a real MySQL connection to add 300 milliseconds of latency or drop half its packets, and mocking the failure in a unit test tells you nothing about how your actual connection pool, timeouts, and retry logic behave under real socket-level conditions. Shopify's answer was to build a tool that sits on the wire itself and misbehaves on command.

## A proxy built to misbehave

Toxiproxy is a small TCP proxy, written in Go, that sits between a service and its dependencies — a database, a cache, an internal API — and is entirely inert by default, passing traffic through unmodified. What makes it useful is a set of "toxics" that can be attached and removed at runtime through an HTTP API: added latency and jitter, bandwidth caps, connection resets, slow closes, and full timeouts. Because the toxics are controlled through an API rather than baked into config files, tests can flip network conditions on and off mid-run, simulating a dependency degrading and recovering while the system under test keeps running.

```text
# Point the app at the proxy instead of MySQL directly
toxiproxy-cli create mysql_proxy \
  --listen localhost:26016 --upstream localhost:3306

# Inject 1000ms of latency on all traffic through it
toxiproxy-cli toxic add mysql_proxy \
  --type latency --attributes latency=1000
```

## Testing failure paths deliberately, not accidentally

The value of Toxiproxy wasn't just simulating one bad connection — it let engineers write automated tests that assert on behavior under degraded conditions: does the connection pool time out and recover cleanly, does a retry storm happen, does a circuit breaker actually open. That turned resilience code, which is otherwise exercised only during real incidents, into something with the same test coverage expectations as ordinary business logic. Because Toxiproxy runs as a lightweight local or CI-adjacent process rather than requiring a full chaos-engineering platform, teams could adopt it in ordinary test suites without standing up new infrastructure.

## From an internal tool to shared infrastructure

Shopify open-sourced Toxiproxy, and it's since been picked up broadly across the industry as a standard way to test network resilience in CI pipelines, independent of the specific language or framework a team uses — it just needs a TCP connection to intercept. That mirrors a pattern that shows up elsewhere in Shopify's engineering culture: internal tools built to solve a real, specific pain point get generalized and released rather than kept private, which also means the tool keeps improving from outside contributions long after the original problem that motivated it is solved.

## What a mid-size team can steal from Toxiproxy

Toxiproxy sits in the network path and injects latency, resets, and partitions so tests can see what production already knows: dependencies lie. Mid-size steal: in CI, run the checkout path with the payment client delayed and with Redis refused, and assert the user-visible outcome — retry later, not a 500 with a stack. You do not need a mesh of toxics on day one; one proxy in front of the flakiest dependency teaches the team.

The concrete failure mode is tests that enable toxics and then assert only that an exception class was raised, not that money stayed consistent. Another is leaving Toxiproxy in a degraded state in a shared staging environment so the next team debugs "staging is weird" for a day. Steal ephemeral environments or a clear reset. Operational gotcha: timeouts in the client shorter than the toxic, so you never exercise retries; or retries without idempotency, so the test that injects a delay after send duplicates a capture. Pair Toxiproxy with the idempotency lessons from Shopify's job stack. Do not block every merge on a full chaos suite; pick the top five dependency failures from last year's incidents and encode them. The tool is a fixture. The culture is refusing to ship a call without a named timeout and a named fallback. That is what scales down to a 20-person commerce team.

## What you can borrow

- Simulate failure at the protocol layer (a proxy intercepting real TCP traffic) rather than only mocking it in application code — the two exercise very different code paths.
- Make failure conditions toggleable at runtime through an API, so tests can assert on both degradation and recovery, not just a single broken state.
- Write real, automated tests for your retry, timeout, and circuit-breaker logic — treat resilience code with the same rigor as business logic.
- A narrowly-scoped internal tool that solves one real problem well is often worth open-sourcing; the ecosystem around it can outlive the original use case.
