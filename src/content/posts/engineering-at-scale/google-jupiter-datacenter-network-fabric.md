---
title: "Jupiter: Rebuilding the Network Underneath Google's Datacenters"
slug: "google-jupiter-datacenter-network-fabric"
description: "How Google's Jupiter network fabric used Clos topologies and centralized control to scale datacenter bandwidth by orders of magnitude."
publishedAt: "2026-02-24"
category: "Google"
tags:
  - Engineering at Scale
  - Google
  - Networking
  - Datacenter Infrastructure
sources:
  - title: "Jupiter Rising: A Decade of Clos Topologies and Centralized Control in Google's Datacenter Network"
    author: "Arjun Singh et al."
    publisher: "SIGCOMM 2015"
    url: "https://research.google"
---

Traditional datacenter networks were built the way enterprise networks generally were: a hierarchy of increasingly expensive, increasingly specialized switches and routers at the top of the tree, with bandwidth that didn't scale cheaply as you added more racks. That model breaks down at the scale Google's datacenters operate at, where the aggregate bandwidth demand between machines, driven by distributed computation like MapReduce jobs shuffling data between thousands of workers, dwarfs what a conventional hierarchical network design can deliver without spending disproportionately on the most expensive tier of hardware. The 2015 SIGCOMM paper "Jupiter Rising: A Decade of Clos Topologies and Centralized Control in Google's Datacenter Network," by Arjun Singh and coauthors, described roughly ten years of Google evolving its datacenter network fabric to solve this, culminating in the Jupiter design.

## Clos topology: bandwidth from many cheap switches, not few expensive ones

The core architectural choice underlying Jupiter (and its predecessors at Google going back roughly a decade) is a Clos network topology, which achieves high bisection bandwidth using many stages of smaller, cheaper, commodity switches wired together in a specific pattern, rather than fewer large, expensive, specialized switches. This mirrors the same philosophy GFS and MapReduce applied to storage and compute: instead of relying on a small number of powerful, expensive components, build the desired capability from a much larger number of cheap, interchangeable ones, accepting more complexity in the topology and control plane in exchange for cost and scaling advantages.

A Clos topology also means the network can scale incrementally — adding more bandwidth or more endpoints doesn't require replacing the whole fabric with bigger switches, just adding more of the same commodity building blocks in the existing pattern. Over successive generations, Google's datacenter network bandwidth grew by roughly two orders of magnitude, made possible largely by staying on this scalable topological approach rather than a design that hit a hard ceiling.

## Centralizing the control plane

The second major theme in Jupiter's design is centralized control: rather than each switch making independent, locally-computed routing decisions the way traditional distributed routing protocols do, Google built centralized software controllers with a global view of the network's topology and traffic, able to compute more globally optimal routing and traffic engineering decisions than distributed protocols converging independently ever could. This is the same software-defined networking philosophy that became an industry-wide trend afterward, but Google was running production centralized network control at datacenter scale years before "SDN" became a common industry term.

Centralized control also simplified operating the network: a single logical control plane made it dramatically easier to reason about the network's global state, roll out changes safely, and debug problems, compared to inferring global behavior from the emergent interaction of thousands of independently-deciding distributed routers.

## What you can borrow

- Bandwidth and scale often come more cheaply from many interchangeable, commodity components wired in a deliberate topology than from fewer, larger, specialized ones — a pattern that shows up across storage, compute, and networking at Google.
- Centralizing control-plane decisions (routing, traffic engineering) over a distributed data plane can produce better global outcomes than fully distributed protocols, as long as the controller itself is built for availability.
- Design your infrastructure topology to scale incrementally — adding capacity should mean adding more of the same building block, not replacing the architecture.
- Even without Google's scale, the SDN principle of separating a smart, global control plane from simple, fast data-plane devices is broadly applicable to internal network design.
- Revisit infrastructure that was state-of-the-art a decade ago; Jupiter itself was the product of roughly ten years of iteration, not a single redesign.
