---
title: "Borg: The Cluster Manager That Quietly Became Kubernetes' Blueprint"
slug: "google-borg-cluster-manager-kubernetes-origins"
description: "Inside Borg, Google's internal cluster manager, and how its ideas about scheduling, priority, and bin packing became the design for Kubernetes."
publishedAt: "2025-12-30"
updatedAt: "2026-09-16"
category: "Google"
tags:
  - Engineering at Scale
  - Google
  - Kubernetes
  - Cluster Management
sources:
  - title: "Large-scale cluster management at Google with Borg"
    author: "Abhishek Verma et al."
    publisher: "EuroSys 2015"
    url: "https://research.google"
---

Long before Kubernetes existed as an open source project, Google was running essentially all of its production workloads — search, Gmail, internal infrastructure, everything — on a cluster management system called Borg. Google didn't describe it publicly in detail until a 2015 EuroSys paper, "Large-scale cluster management at Google with Borg," but by then Borg had already been running for roughly a decade at a scale most companies still haven't reached: hundreds of thousands of jobs, across many clusters, each cluster spanning tens of thousands of machines.

## Cells, jobs, and tasks

Borg organizes machines into "cells," a set of machines managed as a unit, and users submit "jobs" made up of one or more "tasks" that run inside containers on those machines. A central component, the Borgmaster, tracks cluster state and makes scheduling decisions, while a per-machine agent called the Borglet manages the actual containers running on that node, reporting status back and handling task lifecycle locally. Splitting responsibility this way — one place holding cluster-wide state and intent, many places actually executing and reporting locally — is the same shape modern cluster orchestration still uses.

Borg's scheduler had to reconcile a hard tension: pack workloads tightly enough to use hardware efficiently, since idle capacity is wasted money at Google's scale, while still leaving enough headroom that latency-sensitive production services weren't starved by lower-priority batch work. It handled this with a priority and quota system, plus a class distinction between latency-sensitive "prod" jobs and best-effort batch jobs, and features like resource reclamation — estimating a task's actual usage rather than trusting its requested reservation, and using the difference to opportunistically schedule additional lower-priority work into that headroom.

## Failure as an expected, routine event

At Borg's scale, machine failures, kernel upgrades, and hardware maintenance aren't exceptional events, they're routine background noise the system has to absorb without operator intervention. Borg's design assumes tasks will be killed and rescheduled elsewhere regularly, and job configurations are expected to tolerate that — an approach that pushed application authors toward stateless, restart-tolerant service design as the default rather than the exception, much like Netflix's chaos engineering pushed the same discipline through deliberate failure injection rather than architectural assumption.

## From Borg to Omega to Kubernetes

Google built an intermediate system called Omega, which explored a more decentralized, optimistic-concurrency approach to scheduling before some of its ideas fed back into Borg's own evolution. But the more consequential lineage runs from Borg to Kubernetes: when Google open sourced Kubernetes in 2014, it was explicitly built by engineers who had worked on Borg and Omega, carrying over concepts like pods (Borg's task grouping, generalized), declarative desired-state configuration, and a scheduler that separates "what should run" from "where it currently runs." Kubernetes' original internal codename, "Seven," was a nod to the Star Trek Borg character Seven of Nine — a fairly direct acknowledgment of its ancestry.

The difference wasn't the core ideas, which Google had already validated internally for a decade — it was making those ideas available as an open, vendor-neutral system the rest of the industry could run, rather than something locked inside one company's datacenters.

## What broke when they scaled

Static machine assignment wastes a fleet. Borg (Verma et al., EuroSys 2015 — describing a system that had run for years) schedules jobs as tasks into cells, with priorities, so prod and batch share machines. Failure is normal; the scheduler resubmits. What broke naive cluster use was stranded CPU, noisy neighbors, and humans placing binaries. Omega and then Kubernetes exported a Borg-like API (pods, declarative desired state) without copying Borg's internals.

Kubernetes at Google scale is not Borg; Borg had years of admission control, production-vs-batch mixing, and a different control plane. What breaks k8s copies is treating the API server as infinitely scalable, or running mixed laptops-and-prod without priority. Resource estimation (Borg's "guess then measure") still matters: requests vs limits, eviction, and overcommit.

The paper is careful: Kubernetes is inspired by, not a source drop of, Borg.

## A smaller-team version of the same idea

One Kubernetes cluster, resource requests that are not fiction, liveness/readiness probes, and a scheduler that can reschedule dead nodes. Do not mix batch ML training with latency-critical serving without QoS. Nomad or a cloud scheduler is fine. Read the Borg paper for the *ideas* (cells, priority, reallocating idle prod headroom), not to reimplement Borg.

## What you can borrow

- Separate the "what should be running" declaration from the "make it actually running" execution loop — that split is what makes self-healing systems tractable.
- Design for routine failure, not exceptional failure — if restarts and reschedules are rare in your system, they'll be handled badly when they happen.
- Distinguish latency-sensitive workloads from best-effort batch work explicitly, and let the scheduler use that distinction to pack resources efficiently.
- Validate an architecture internally at real scale before trying to generalize or open source it — Borg had a decade of production hardening before Kubernetes existed.
