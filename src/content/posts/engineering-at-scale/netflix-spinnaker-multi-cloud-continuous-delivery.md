---
title: "Spinnaker: How Netflix Turned Deployment Into a Repeatable Pipeline"
slug: "netflix-spinnaker-multi-cloud-continuous-delivery"
description: "Why Netflix built Spinnaker to standardize continuous delivery across hundreds of teams and multiple cloud providers instead of scripting deploys by hand."
publishedAt: "2025-09-22"
updatedAt: "2026-09-16"
category: "Netflix"
tags:
  - Engineering at Scale
  - Netflix
  - Continuous Delivery
  - Cloud Infrastructure
sources:
  - title: "Netflix Technology Blog"
    publisher: "Netflix"
    url: "https://netflixtechblog.com"
  - title: "Spinnaker"
    publisher: "Netflix Open Source"
    url: "https://netflix.github.io"
---

Netflix's shift to microservices on AWS solved a scaling problem and created a deployment one: hundreds of independent services, each owned by a different team, each needing to ship code safely and often, without a central release train slowing everyone down to the pace of the most cautious team. Netflix's earlier deployment tooling, Asgard, handled AWS deployments well but was tied to a single cloud provider and a simpler era of the company's infrastructure. As Netflix's deployment needs grew more complex — canary analysis, multi-region rollouts, eventually multiple cloud targets — the team built Spinnaker as its successor.

## Pipelines as the unit of delivery

Spinnaker's core abstraction is the pipeline: a defined sequence of stages — bake a new image, deploy to a test environment, run automated canary analysis, deploy to a percentage of production, wait for manual judgment, deploy to the rest — that a team configures once and then reuses for every release. That's a deliberate move away from deployment as a sequence of ad hoc scripts run by whoever's on call, toward deployment as a versioned, auditable, repeatable artifact that looks the same whether it's 2 a.m. or the middle of a Tuesday standup.

Because the pipeline model is declarative and stage-based, Spinnaker could layer safety mechanisms directly into the deployment process rather than bolting them on afterward: automated canary analysis compares metrics from a small slice of new-version traffic against a baseline before committing to a full rollout, and if the canary looks unhealthy, the pipeline can roll back automatically without a human needing to notice and intervene first.

## Multi-cloud by design, not by accident

A defining decision in Spinnaker's architecture was to support multiple cloud providers — not just AWS, where Netflix's own infrastructure lived, but also targets like Google Cloud Platform, Azure, Kubernetes, and others — through a pluggable provider model. Netflix's own production usage stayed AWS-centric, but building Spinnaker as multi-cloud from early on meant the deployment abstractions (clusters, server groups, load balancers) were never hard-coded to one provider's specific API shape, which mattered enormously once Netflix open sourced Spinnaker and other companies started running it against their own, often non-AWS, infrastructure.

That multi-cloud generality became one of Spinnaker's biggest adoption drivers outside Netflix: companies running Kubernetes, or a mix of cloud providers, could get the same pipeline-and-canary model Netflix built for itself, through the same tool, which is a large part of why Spinnaker became a widely adopted piece of continuous-delivery infrastructure across the industry rather than staying a Netflix-only tool.

## Judgment stages and organizational reality

Not every deployment should be fully automatic, and Spinnaker's pipeline model explicitly supports manual judgment stages — points where a pipeline pauses and waits for a human to approve continuing. That's not a compromise on the automation vision, it's a recognition that different services have different risk profiles: a low-traffic internal tool might deploy fully automatically end to end, while a customer-facing payment path might require a person to eyeball canary results before the rollout proceeds to full production. Letting each team configure that trade-off for their own service, rather than imposing one deployment policy company-wide, was central to getting broad adoption across teams with very different risk tolerances.

## Operational gotchas of a multi-cloud delivery plane

Spinnaker made multi-cloud deploy look like a pipeline of stages: bake, deploy, verify, promote. Mid-size teams install it and then encode every snowflake in JSON until nobody can change a server group without a platform engineer. Steal the stage model — artifact in, health checks, canary, fast rollback — on top of the orchestrator you already have, whether that is GitHub Actions talking to Kubernetes or a lighter CD tool.

The concrete failure mode is a canary that compares the wrong metrics, declares success, and 100% of traffic follows a memory leak. Another is baking AMIs or images that differ from what developers ran in CI because a late package update snuck in. Pin everything. Multi-cloud Spinnaker without a real multi-cloud need adds two IAM models and a lowest-common-denominator networking story. Operational gotcha: pipeline as the only source of truth while Terraform also mutates the same ASG. Pick an owner. Red/black deploys that forget to drain connections drop in-flight streams — painful for video and for any long poll. Steal connection draining and session-aware cutover. If your deploy tool can hit every cluster, it is a production credential; treat pipeline editors like production access, with two-person review on new bake configs.

## What you can borrow

- Model deployment as a declarative, reusable pipeline rather than a collection of ad hoc scripts — it becomes auditable and consistent across teams.
- Build automated canary analysis into the deployment path itself, not as a separate manual step someone has to remember to run.
- Design abstractions to be provider-agnostic even if you only run on one provider today — the flexibility pays off when your infrastructure changes.
- Let teams choose their own automation-versus-judgment balance per service instead of imposing one deployment policy company-wide.
- Treat rollback as a first-class pipeline stage, not an emergency manual procedure improvised during an incident.
