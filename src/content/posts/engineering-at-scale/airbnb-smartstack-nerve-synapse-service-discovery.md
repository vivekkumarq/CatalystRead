---
title: "SmartStack: Airbnb's Early Answer to Service Discovery"
slug: "airbnb-smartstack-nerve-synapse-service-discovery"
description: "Before service meshes existed, Airbnb built SmartStack — Nerve and Synapse plus local HAProxy — to make service discovery reliable during its microservices split."
publishedAt: "2025-09-24"
category: "Airbnb"
tags:
  - Engineering at Scale
  - Airbnb
  - Service Discovery
  - Infrastructure
---

As Airbnb began pulling services out of its Rails monolith in the early-to-mid 2010s, a problem showed up that hadn't mattered when everything ran in one process: how does one service find another, reliably, as instances come and go under continuous deployment and autoscaling? DNS was too slow to update and too coarse for health-aware routing. Hardcoded host lists broke constantly. Airbnb needed something that could track which service instances were actually healthy and reachable, in near real time, without a human updating a config file every time a box was replaced.

## Splitting the problem into announce and discover

Airbnb's solution, SmartStack, split service discovery into two cleanly separated pieces. Nerve ran alongside each service instance and continuously health-checked it, announcing "I'm alive and here" into a central coordination store (ZooKeeper) only while the check kept passing. Synapse ran on every host that needed to call other services, watched ZooKeeper for the current set of healthy instances of each service it depended on, and used that information to keep a local HAProxy configuration up to date. Callers never talked to ZooKeeper or to a remote discovery service directly — they just made a normal request to localhost, and Synapse-managed HAProxy handled routing it to a currently healthy instance elsewhere on the network.

## Why local HAProxy mattered

Routing every service call through a local, continuously updated HAProxy instance rather than a shared central load balancer was the core design decision. It meant discovery and routing logic lived on the same host as the caller, so a failure or slowdown in the coordination layer degraded gracefully — Synapse could keep serving the last known-good routing table even if ZooKeeper briefly became unreachable, rather than every request in the fleet blocking on a live discovery lookup. It also meant existing services didn't need to be rewritten with a discovery-aware client library; they just made an HTTP or TCP call to localhost like they always had, and the infrastructure layer handled the rest — a meaningful advantage while migrating dozens of services out of a monolith that couldn't all be rewritten at once.

## A precursor to the service mesh

SmartStack, open sourced by Airbnb around 2013, predates the term "service mesh" but solved essentially the same problem later products like Consul, Envoy, and Istio would standardize: health-aware, dynamically updated routing between services, decoupled from application code. Airbnb's own later infrastructure evolved past SmartStack as the company's scale and the surrounding ecosystem matured, but the sidecar pattern — a local proxy handling cross-cutting network concerns so application code doesn't have to — is the same architectural idea that underlies modern service meshes.

## What you can borrow

- Separate "am I healthy and discoverable" from "who's healthy and how do I reach them" into two distinct responsibilities — it keeps each piece simpler and lets them fail independently without full outages.
- Routing local traffic through a per-host proxy that caches the last known-good state protects you from a coordination service's brief unavailability turning into a full request outage.
- A sidecar that handles discovery and routing lets you evolve networking infrastructure without rewriting application code — valuable precisely when you're migrating incrementally and can't touch everything at once.
- Health checks that gate whether an instance announces itself at all (not just checks run by the load balancer) catch a wider range of failure modes than external checks alone.
