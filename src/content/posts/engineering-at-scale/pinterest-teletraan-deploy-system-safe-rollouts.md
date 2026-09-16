---
title: "Teletraan: How Pinterest Made Deploys Safe and Self-Service"
slug: "pinterest-teletraan-deploy-system-safe-rollouts"
description: "Pinterest built Teletraan to let any engineer deploy their own service safely, with staged rollouts and fast rollback replacing manual, ops-gated pushes."
publishedAt: "2025-07-15"
updatedAt: "2026-09-16"
category: "Pinterest"
tags:
  - Engineering at Scale
  - Pinterest
  - Deployment
  - Infrastructure
sources:
  - title: "Pinterest Engineering Blog"
    publisher: "Pinterest"
    url: "https://medium.com/pinterest-engineering"
---

As Pinterest's engineering organization grew, so did the number of services and the number of engineers who needed to ship changes to them, and the deploy process itself became a real bottleneck. Pushing code to production had historically leaned on scripts and manual coordination that worked fine when a small team owned a handful of services, but broke down once dozens of teams needed to deploy independently, safely, and without waiting on a central operations team to babysit every push. Pinterest built Teletraan, an internal deploy system later open sourced, to make deploys a self-service, largely automated part of an engineer's workflow rather than a manually gated event.

## Self-service without giving up safety

The core tension in any deploy system used by many independent teams is balancing autonomy against blast radius: give every engineer full control over pushing to production and you risk a bad deploy taking down a service with no guardrails in place; keep deploys centrally gated and you turn a small operations team into a bottleneck that slows down every team in the company. Teletraan's answer was to give engineers a self-service web interface and API to deploy their own services, but to build the safety mechanisms — staged rollouts, health checks, automated pause-on-failure — directly into the deploy path itself, so safety didn't depend on a human reviewing every push before it happened.

## Staged rollouts instead of all-at-once pushes

Rather than pushing a new build to an entire fleet of hosts simultaneously, Teletraan deploys in stages: a small canary group of hosts gets the new build first, followed by progressively larger percentages of the fleet, with the deploy pausing automatically between stages if error rates or other health signals degrade. This staged approach means a bad build's damage is contained to a small slice of traffic and caught by automated monitoring before it ever reaches the majority of production hosts, rather than a mistake in one deploy immediately becoming an outage for the whole service.

```text
Stage 1: canary hosts (small %)   -> monitor health
Stage 2: expanded rollout (larger %) -> monitor health
Stage 3: full fleet                -> monitor health
  any stage: health regression -> pause / auto-rollback
```

## Rollback as a first-class, fast operation

A staged rollout only helps if catching a bad deploy early actually translates into a fast recovery, so Teletraan was built to make rolling back to a previous known-good build just as easy and fast as rolling forward — an engineer (or an automated health check) triggering a rollback shouldn't be a slower, more manual process than the deploy that caused the problem in the first place. Treating rollback as a routine, well-tested path rather than a rare emergency procedure meant engineers could deploy more confidently, knowing that a mistake was a quick, low-drama fix rather than an incident requiring manual intervention.

## Integrating with the rest of the fleet

Because Teletraan managed deploys across Pinterest's fleet of hosts and autoscaling groups, it needed to stay aware of the broader infrastructure state — which hosts existed, which were healthy, which were being replaced by autoscaling — rather than operating as an isolated tool disconnected from host management. That integration meant a deploy could correctly target the current, live set of hosts for a service even as the underlying fleet changed shape dynamically, which is a much harder problem than deploying to a static, manually maintained list of servers.

## Operational gotchas of safe rollout systems

Teletraan-style deploy tools encode what humans forget at 2 a.m.: stage, canary, pause, rollback. Mid-size steal: a mandatory canary on production with automatic halt on error-rate or latency deltas, even if the "system" is a script around Kubernetes rollouts. The failure mode is a dashboard nobody looks at because the halt thresholds were noisy and engineers learned to skip.

Operational gotcha: canaries that only hit internal staff, while a regional ISP or a particular mobile version is where the bug lives. Another is configuration deploys that bypass the binary pipeline; a flag or a traffic rule can take the site down without a Teletraan record. Steal one control plane for code and config. Partial rollouts plus sticky sessions mean some users never leave the canary and others never enter, ruining metrics. Connection draining on pin upload or long-lived connections needs extra time. If deploy permissions are broad, a well-meaning hotfix will skip stages. Two-person review for production accelerate should be the default. Teletraan's value is memory: the last known good, the diff, the owner. If your system cannot name who shipped and how to revert in one command, you do not yet have safe rollouts, you have hope plus git.

## What you can borrow

- Make safety mechanisms — staged rollout, automated health checks, pause-on-regression — part of the deploy pipeline itself, not a manual review step that becomes a bottleneck as your team grows.
- Roll new builds out in stages, starting with a small canary group, so a bad deploy's blast radius is contained and caught before it reaches most of your traffic.
- Invest as much in making rollback fast and routine as you invest in making forward deploys safe; a slow rollback erases the benefit of catching problems early.
- Keep your deploy system aware of live infrastructure state rather than a static host list, especially once autoscaling is involved.
- Self-service tooling and safety aren't in tension if the guardrails are automated rather than manual — build for both from the start.
