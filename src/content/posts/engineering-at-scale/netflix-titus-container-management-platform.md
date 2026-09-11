---
title: "Titus: Running Containers Alongside Instances Without Rewriting Everything"
slug: "netflix-titus-container-management-platform"
description: "How Netflix built Titus, its own container management platform on EC2, to bring containers into an infrastructure stack built around AWS instances."
publishedAt: "2025-10-30"
category: "Netflix"
tags:
  - Engineering at Scale
  - Netflix
  - Containers
  - Cloud Infrastructure
sources:
  - title: "Netflix Technology Blog"
    publisher: "Netflix"
    url: "https://netflixtechblog.com"
  - title: "Titus"
    publisher: "Netflix Open Source"
    url: "https://netflix.github.io"
---

By the mid-2010s, Netflix's cloud infrastructure had matured around EC2 instances, autoscaling groups, and a deep set of tooling — Spinnaker for deployment, Eureka for service discovery, Atlas for telemetry — all built assuming a service meant a fleet of virtual machines. Containers were becoming the industry's preferred unit of deployment for good reasons: faster startup, denser packing, more consistent environments between development and production. Netflix wanted those benefits without throwing away years of investment in instance-based tooling, so instead of adopting an off-the-shelf orchestrator wholesale, it built Titus, a container management platform designed to run on top of the existing AWS and Netflix infrastructure rather than replace it.

## Containers that speak the same network language

The defining design decision in Titus was giving containers full AWS networking integration — each container gets its own elastic network interface and security group membership, the same as an EC2 instance would, rather than living behind a separate container-networking overlay. That choice meant containerized services could participate in the same VPC-level security policies, the same network isolation model, and the same tooling that instance-based services already used, instead of needing a parallel networking stack that behaved differently and had to be secured, monitored, and debugged separately.

That integration came at real engineering cost — it's considerably more work to give every container real AWS networking than to run a simpler overlay network — but it meant Titus could slot into Netflix's existing security and compliance posture rather than becoming an exception that needed its own review process.

## Mesos, then Kubernetes-compatible APIs

Titus's scheduler was originally built on Apache Mesos, which provided the resource-offer model for deciding which containers to place on which hosts. As Kubernetes became the industry's dominant scheduling API, Netflix moved Titus toward Kubernetes compatibility at the control-plane and API level, letting internal teams and their tooling interact with Titus using increasingly standard, Kubernetes-shaped interfaces even as the underlying implementation continued to reflect Netflix's own operational requirements. That's a similar pattern to Keystone's Samza-to-Flink migration elsewhere in Netflix's stack: adopt an internally built solution first to solve an immediate problem, then migrate the implementation toward an industry-standard approach once one matures, without forcing every consuming team to migrate on day one.

## Batch and service workloads on one platform

Titus runs two meaningfully different kinds of workloads: long-running services that need to stay up and be discoverable, and batch and machine-learning jobs that run to completion and are far more tolerant of interruption. Supporting both on one platform let Netflix consolidate its container infrastructure instead of running separate systems for services versus batch compute, and it let batch workloads opportunistically use capacity that would otherwise sit idle waiting for peak service traffic, improving overall resource utilization across Netflix's AWS footprint.

That shared-capacity model is a meaningful efficiency win at Netflix's scale: streaming traffic has a strong daily and weekly cycle, and batch and ML training jobs can be scheduled to soak up spare capacity during off-peak hours rather than requiring their own dedicated, separately-provisioned fleet.

## What you can borrow

- When adopting a new deployment unit like containers, evaluate what existing tooling and security posture it needs to integrate with before picking an architecture that ignores that context.
- Build toward industry-standard APIs over time rather than requiring a big-bang migration away from a working internal solution.
- Consolidate batch and service workloads on shared infrastructure where their resource-usage patterns complement each other.
- Expect deep integration (like native cloud networking for containers) to cost more upfront engineering time — budget for it deliberately rather than defaulting to the simpler overlay approach and hoping it's enough.
