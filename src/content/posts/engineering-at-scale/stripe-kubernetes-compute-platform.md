---
title: "Running Stripe's Compute on Kubernetes"
slug: "stripe-kubernetes-compute-platform"
description: "Why Stripe moved its compute platform onto Kubernetes, and the engineering work required to run a payments company's workloads on top of it safely."
publishedAt: "2026-03-25"
updatedAt: "2026-09-16"
category: "Stripe"
tags:
  - Engineering at Scale
  - Stripe
  - Kubernetes
  - Infrastructure
sources:
  - title: "Stripe Engineering Blog"
    publisher: "Stripe"
    url: "https://stripe.com/blog"
---

For years, Stripe ran its infrastructure on internally built tooling layered over bare virtual machines — a system that worked but that engineers increasingly had to build and maintain themselves rather than adopt from a broader ecosystem. As the number of services and the number of engineers deploying them grew, Stripe made the decision to move its compute platform onto Kubernetes, trading a fully custom system for an industry-standard one, with all the migration work that implies for a company that cannot tolerate downtime in its core payments path.

## Why move off something that already worked

A homegrown deployment and orchestration system has a real cost that's easy to underweight while it's still working: every feature it lacks has to be built in-house, every operator who joins has to learn a system that exists nowhere else, and the broader ecosystem of tooling, monitoring integrations, and operational knowledge that grows up around a widely adopted standard like Kubernetes simply doesn't exist for something bespoke. Stripe's move to Kubernetes was, in large part, a bet that standardizing on a system with a large open-source community and ecosystem would pay off in engineering leverage over the long run, even though the migration itself was significant work with no visible feature for customers at the end of it.

## Migrating a payments company's workloads without downtime

Moving live services from one compute platform to another while they continue serving payment traffic rules out a cutover where everything moves at once. Stripe's approach involved migrating services incrementally, service by service, validating each one under real production traffic on the new platform before moving on to the next, rather than treating the migration as a single big-bang event. This mirrors the same discipline Stripe applies to online database migrations elsewhere in its infrastructure: dual-running where necessary, verifying behavior matches before fully cutting over, and being willing to move slowly through a long tail of services rather than rushing the highest-risk ones.

## What changes for engineers day to day

The point of the migration wasn't Kubernetes for its own sake — it was what standardizing on it enables for the engineers building on top of it. A common, well-documented deployment model means new services can be brought up following a known pattern instead of learning bespoke internal tooling, autoscaling and resource management benefit from a large ecosystem of existing solutions rather than custom-built equivalents, and operational knowledge becomes more transferable, since an engineer's Kubernetes experience from elsewhere carries over instead of starting from zero at Stripe specifically.

## The trade-off of adopting a general-purpose platform

Kubernetes is a general-purpose system built to serve a huge range of use cases, which means some of its defaults and abstractions don't map perfectly onto a payments company's specific needs around reliability, compliance, and workload isolation. Part of the engineering work in adopting it is building the internal layer on top — policies, guardrails, and platform tooling — that constrains Kubernetes's generality down to the specific, safer subset of behavior Stripe's workloads actually need, rather than exposing the full flexibility of the underlying platform directly to every service team.

## Operational gotchas of running payments on Kubernetes

A Kubernetes platform under a payments company still has to drain connections without dropping a capture, pin images, and explain which pod talked to which datastore. The failure mode is treating pods as cattle while PCI and audit need a pedigree. Mid-size steal: immutable deploys, short TTLs on credentials, and disruption budgets that respect in-flight work, not only replica counts.

Operational gotcha: sidecars that retry and the app that retries, doubling charges if idempotency is missing. Another is cluster autoscaler removing a node that held a worker mid-job. Use preStop hooks and queue visibility. Network policies that miss a payment processor IP will fail in one AZ's egress path and look like "Stripe is down" when it is you. Watch egress. Multi-tenant clusters that also run batch ML will noisy-neighbor a latency SLO; isolate the money path. Stripe can build a custom compute platform. You can use GKE/EKS with a dedicated node pool, PodSecurity, and no SSH. The steal is not a control plane clone. It is admitting that orchestration is part of the threat model: anyone who can schedule a pod in the payments namespace is in the payments business. RBAC reviews belong on the same calendar as key rotation.

## What you can borrow

- Weigh the ongoing cost of maintaining custom infrastructure against the leverage of standardizing on a widely adopted platform — the custom system's cost is easy to underweight while it's still working.
- Migrate compute platforms incrementally, service by service, with real production validation at each step, rather than a single cutover.
- Expect to build a constrained, opinionated layer on top of a general-purpose platform rather than exposing its full flexibility directly to every team.
- Treat a platform migration as an investment in engineer leverage and ecosystem access, not just a technical upgrade with no product-facing payoff.
- Apply the same incremental, verify-before-cutover discipline to infrastructure migrations that you'd apply to a data migration — the stakes for a live system are similar.
