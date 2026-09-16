---
title: "Moving Pinterest's Fleet to Kubernetes"
slug: "pinterest-kubernetes-migration-platform-abstractions"
description: "How Pinterest migrated thousands of services onto Kubernetes and built internal platform abstractions so product teams didn't need to become infrastructure experts."
publishedAt: "2025-12-08"
updatedAt: "2026-09-16"
category: "Pinterest"
tags:
  - Engineering at Scale
  - Pinterest
  - Kubernetes
  - Infrastructure
---

Pinterest's infrastructure grew for years on a mix of directly managed virtual machines and internally built deployment tooling, an approach that worked but meant every improvement to scheduling, resource utilization, or deployment workflow had to be built and maintained in-house rather than adopted from a broader ecosystem. As the company's service count and traffic grew, Pinterest's infrastructure teams undertook a migration to Kubernetes, moving the fleet onto a widely adopted, actively developed container orchestration platform rather than continuing to invest in bespoke internal tooling for problems the broader industry was already solving well.

## Why move to something the industry had already converged on

By the time Pinterest committed to this migration, Kubernetes had become the dominant standard for container orchestration, with an ecosystem of tooling, operational knowledge, and hiring pool built around it that a homegrown internal system could never fully match. Betting on a widely adopted open standard meant Pinterest's infrastructure team could benefit from improvements made across the entire Kubernetes community — scheduler enhancements, autoscaling techniques, security patches — instead of shouldering the full engineering cost of building and maintaining equivalent capability internally. It also made it considerably easier to hire engineers who already understood the platform, rather than requiring every new infrastructure hire to learn Pinterest-specific tooling from scratch.

## Migrating without breaking a running platform

A migration of this scope, moving a large number of existing services off legacy deployment tooling and onto a new orchestration model, could not happen as a single cutover without unacceptable risk to a platform serving live production traffic continuously. Pinterest's approach involved running services on both the legacy infrastructure and Kubernetes in parallel during transition, migrating services incrementally, and building tooling to validate that a service behaved equivalently — same latency profile, same resource footprint, same reliability characteristics — before fully committing its production traffic to the new platform. This kind of parallel-run validation is slower than a hard cutover but dramatically lowers the risk of a migration-induced outage in a service that matters to real users.

## Abstractions so product teams don't need to learn Kubernetes internals

Raw Kubernetes exposes a lot of complexity — pods, deployments, services, ingress rules, resource requests and limits — that most product engineering teams at Pinterest shouldn't need to understand deeply just to ship a service. A significant part of the migration effort went into building internal platform abstractions on top of Kubernetes: simplified deployment configurations, sane resource defaults, and self-service tooling that let a product team deploy and scale a service without needing to become Kubernetes experts themselves.

```yaml
# what a product team writes (simplified, illustrative)
service: recommendation-api
replicas: 10
resources: standard-medium
# what the platform abstraction generates underneath:
# full Deployment, Service, HPA, resource requests/limits, etc.
```

This is a common and important pattern in large infrastructure migrations: adopting a powerful, complex underlying platform is only half the win if every team then has to individually absorb that complexity. The other half is building a thin, well-designed abstraction layer that captures sane defaults and internal conventions, so most engineers interact with a much simpler interface while the platform team owns and evolves the complexity underneath.

## What a mid-size team can steal from Pinterest's K8s move

Pinterest did not "move to Kubernetes" as a slogan; they wrapped it so developers kept a Pinterest-shaped interface instead of raw YAML. That is the steal. Mid-size companies dump Helm charts on product teams and then spend a year on CrashLoopBackOff archaeology. Provide a paved path: a service spec with CPU, ports, secrets, and probes, compiled into Kubernetes by a platform team that owns upgrades.

The concrete failure mode is a cluster upgrade that changes ingress, CNI, or kube-proxy behavior and takes a percentage of pins offline because an annotation was load-bearing folklore. Another is namespace-per-team without NetworkPolicy, so a compromised batch job talks to the metadata store. Operational gotcha: stateful workloads that were lifted from VMs without persistent volume policy, then a node drain deletes a cache that was actually a unique index. Steal disruption budgets and explicit state classes. Image supply chain matters more on Kubernetes because rebuilds are frequent; pin digests. Cost: requests vs usage; Pinterest-scale over-requesting is how the cloud bill becomes the migration's only metric. If you have twenty services, a single cluster and a golden Helm chart may be the abstraction. Do not copy a multi-cluster service mesh until you have a multi-cluster problem and a team to run it.

## What you can borrow

- Weigh the cost of maintaining bespoke internal infrastructure against adopting a widely supported industry-standard platform, especially as your team and hiring needs grow.
- Migrate production services incrementally with parallel-run validation rather than a single risky cutover, particularly for anything customer-facing.
- Don't expose a powerful but complex underlying platform directly to every team; build an internal abstraction layer with sane defaults so most engineers don't need to become experts in it.
- Treat the platform team's abstraction layer as a product in its own right, with its own usability bar for internal customers.
