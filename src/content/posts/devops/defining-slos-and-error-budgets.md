---
title: "Defining SLOs and Error Budgets That Teams Actually Use"
slug: "defining-slos-and-error-budgets"
description: "How to set service level objectives and error budgets that drive real engineering decisions, instead of becoming a number nobody looks at after launch."
publishedAt: "2026-01-12"
category: "DevOps"
tags:
  - SRE
  - Observability
  - DevOps
  - Monitoring
---

An SLO that nobody consults when deciding whether to ship a risky change is just a number in a dashboard. The entire point of defining service level objectives and error budgets is to turn "is our reliability good enough" from a subjective argument into a data-driven decision that both engineering and product can agree on ahead of time, before there's an incident to argue about.

## SLI, SLO, and error budget are three different things

A service level indicator (SLI) is the raw measurement — say, the proportion of HTTP requests that complete successfully within 300ms. A service level objective (SLO) is the target for that indicator over a time window — 99.5% of requests meet that bar over a rolling 30 days. The error budget is simply what's left over: 100% minus the SLO, expressed as an allowance for how much unreliability is acceptable before it's a problem.

```
SLI:  proportion of requests with latency < 300ms and status < 500
SLO:  99.5% over a rolling 30-day window
Error budget: 0.5% of requests, or roughly 216 minutes of full downtime equivalent per 30 days
```

That budget framing matters because it converts an abstract reliability target into a concrete, spendable quantity — which is what makes it useful for decision-making instead of just reporting.

## Picking an SLI that reflects what users actually experience

The most common mistake is measuring something operationally convenient instead of something that reflects user experience. Server-side uptime is easy to measure and frequently wrong as a proxy — a service can report 100% uptime while every request times out at the load balancer before reaching it. Better SLIs are measured as close to the user as possible:

```promql
# Good: measures actual successful, fast responses at the edge
sum(rate(http_requests_total{status!~"5..", le="0.3"}[5m]))
/
sum(rate(http_requests_total[5m]))
```

For multi-step user journeys, consider defining an SLO around the full journey (checkout completion rate) rather than any single backend endpoint, since users don't experience your services individually — they experience the composite of everything a single action touches.

## Using the budget to gate decisions, not just report status

The error budget only earns its keep if it changes behavior. A common and effective policy: while the error budget for a service is healthy, feature teams can ship freely, including riskier changes. Once the budget is exhausted for the current window, the team shifts focus to reliability work — bug fixes, load testing, hardening — until the budget recovers.

```yaml
# Example policy encoded as a simple rule of thumb, not a tool config
budget_remaining > 20%:  normal velocity, ship features
budget_remaining 0-20%:  require extra review on risky changes
budget_remaining <= 0%:  freeze non-critical feature releases, prioritize reliability fixes
```

This does two useful things simultaneously: it gives engineering an objective, pre-agreed justification for slowing down feature work when reliability has actually degraded, and it prevents the opposite failure — chasing five nines on a service where users would genuinely never notice the difference between 99.9% and 99.99%, at the cost of feature velocity nobody asked to trade away.

## Setting the target realistically

A target set too aggressively (99.99% for a service that has never measured above 99.7%) guarantees the budget is perpetually blown, which trains the team to ignore it entirely — the same failure mode as an alert that pages constantly and gets muted. Start by measuring current performance for a few weeks before setting any target, set the SLO slightly above the current baseline, and revisit it quarterly as the service and its usage patterns change. An SLO is a living target tied to actual user tolerance, not a one-time aspirational number picked in a planning meeting.
