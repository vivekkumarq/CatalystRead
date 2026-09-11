---
title: "Chaos Engineering at Netflix: Breaking Things on Purpose"
slug: "netflix-chaos-engineering-and-the-culture-of-resilience"
description: "How a painful database outage pushed Netflix to build Chaos Monkey, the Simian Army, and a culture that tests failure before failure finds you."
publishedAt: "2026-05-15"
category: "Netflix"
tags:
  - Engineering at Scale
  - Netflix
  - Chaos Engineering
  - Distributed Systems
sources:
  - title: "Netflix Technology Blog"
    publisher: "Netflix"
    url: "https://netflixtechblog.com"
  - title: "Principles of Chaos Engineering"
    publisher: "principlesofchaos.org"
trending: true
---

In 2008, a corruption in Netflix's datacenter database kept DVD shipping down for three days. That single incident became the founding story of one of the most influential ideas in reliability engineering. Netflix's response wasn't just to fix the bug — it was to conclude that a single datacenter, and any tightly coupled system, would eventually fail again, so the only durable fix was to migrate to a distributed cloud architecture on AWS and design every service to survive the failure of its neighbors. That decision set the stage for chaos engineering.

## Chaos Monkey and the Simian Army

Moving to AWS solved one problem and created another: distributed systems fail in ways that are hard to predict, and engineers routinely design for the failures they can imagine rather than the ones that actually happen. Netflix's answer, starting around 2011, was Chaos Monkey — a service that randomly terminates production instances during business hours. The logic was blunt: if losing a server at 2 p.m. on a Tuesday can take down your service, you have a design flaw, and it's better to find that flaw on your own schedule than during a real outage at 3 a.m.

Chaos Monkey grew into the "Simian Army," a family of tools each targeting a different failure mode: Latency Monkey injected artificial delays to test degraded-network behavior, Conformity Monkey flagged instances that didn't follow best practices, Doctor Monkey checked instance health and removed unhealthy ones, Janitor Monkey cleaned up unused resources, and Security Monkey looked for misconfigurations. Two members scaled the idea up dramatically: Chaos Gorilla simulated the loss of an entire AWS availability zone, and Chaos Kong simulated the loss of an entire AWS region.

## Regional evacuation as a rehearsed capability

Chaos Kong exercises weren't thought experiments — Netflix built the actual ability to evacuate all user traffic out of a failing AWS region and onto healthy regions, then practiced doing it regularly enough that the runbook stayed accurate and the team stayed confident under pressure. That's a meaningful distinction from most disaster-recovery plans, which are written once, reviewed occasionally, and rarely exercised against real production traffic. Netflix treated regional failover the way an airline treats emergency drills: rehearsed until it's boring.

Netflix also built Failure Injection Testing (FIT), which pushed chaos down to a finer grain than killing whole instances — injecting failures into individual requests and specific service dependencies, so teams could verify that one degraded downstream call led to graceful fallback behavior rather than a cascading failure across the whole request path.

## Principles, not just tools

Netflix engineers helped formalize "chaos engineering" as a discipline with published principles: run experiments in production (staging rarely reproduces real traffic and topology), minimize blast radius, automate experiments so they run continuously rather than as one-off events, and build hypotheses around steady-state behavior so you can measure the actual impact of an injected failure. The goal was never to break things randomly — it was to convert unknown failure modes into known, tested, and ideally automatically-mitigated ones.

The cultural payoff mattered as much as the tooling. Engineers who know their service will be killed at random hours build stateless, redundant, gracefully-degrading systems by default, because the alternative is a pager going off constantly. Chaos engineering became less a testing tool and more a forcing function for architectural discipline across the whole company.

## What you can borrow

- Start small: kill non-critical instances in staging or a canary environment before running experiments against full production traffic.
- Automate game days on a schedule instead of running them only after an incident — muscle memory fades if it isn't exercised.
- Design for graceful degradation explicitly: know what a service does when its dependency is slow or missing, don't discover it during an outage.
- Practice failover, not just architect for it — an untested runbook is a hypothesis, not a capability.
- Minimize blast radius on every experiment so a chaos test can't itself become the outage.
