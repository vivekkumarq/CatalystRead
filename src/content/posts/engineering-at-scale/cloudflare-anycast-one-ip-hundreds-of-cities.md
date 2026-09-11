---
title: "One IP Address, Hundreds of Cities: How Anycast Runs Cloudflare's Network"
slug: "cloudflare-anycast-one-ip-hundreds-of-cities"
description: "How Cloudflare uses anycast routing so a single IP address is announced from hundreds of data centers, with BGP steering each visitor to the nearest one."
publishedAt: "2025-08-09"
category: "Cloudflare"
tags:
  - Engineering at Scale
  - Cloudflare
  - Networking
  - BGP
  - Anycast
sources:
  - title: "A Brief Primer on Anycast"
    publisher: "Cloudflare Blog"
    url: "https://blog.cloudflare.com"
  - title: "How We Scaled Nginx and Saved the World 54 Years Every Day"
    publisher: "Cloudflare Blog"
    url: "https://blog.cloudflare.com"
---

Most services on the internet use unicast addressing: one IP address maps to one physical machine, or at most one data center, and traffic finds its way there over whatever path routing decides is best. That model breaks down for a network like Cloudflare's, which needs to terminate connections in hundreds of cities at once, close to whoever happens to be requesting a page, while presenting customers with a simple, stable set of IP addresses to point their DNS at. The company's answer, used since its earliest days, is anycast: the same IP address is announced simultaneously from every one of Cloudflare's data centers around the world.

## How the same address gets everywhere

Anycast relies on BGP, the routing protocol that glues together the independently-operated networks making up the internet. Cloudflare announces a given IP prefix from routers in every data center it operates, and each of those announcements propagates outward through the networks of the internet's other operators. A router somewhere in, say, Mumbai ends up with multiple paths to reach that IP address — one through a data center in Mumbai, another through one in Singapore, another through Frankfurt — and ordinary BGP path selection, which favors shorter, cheaper paths, tends to steer traffic toward whichever announcement is topologically closest. No DNS-based geolocation trickery is required at all: the same IP address is genuinely present in many places, and the network itself figures out which instance a given packet should go to.

The practical effect is that a visitor in São Paulo and a visitor in Warsaw can both connect to the exact same IP address and land on two entirely different physical servers, each the nearest one to them, without either party's software needing to know that happened.

## What anycast buys beyond latency

The latency win — landing users on a nearby data center — is the most visible benefit, but anycast's more important property for a company like Cloudflare is what it does for DDoS resilience. Because the same address is served from hundreds of locations, an attack traffic flood aimed at that IP doesn't converge on one machine or one data center — BGP naturally spreads the attacking traffic across every location currently announcing the prefix, roughly in proportion to how much of the internet each location is topologically closest to. A volumetric attack that would overwhelm any single data center gets diffused across Cloudflare's entire global capacity instead, which is a structural mitigation that exists before any purpose-built DDoS defense system even has to act.

Anycast also simplifies failover: if a data center goes offline for maintenance or an outage, its BGP announcements withdraw, and traffic that would have gone there simply reroutes to the next-nearest location through the same mechanism, with no changes needed on the customer or client side.

## The engineering cost of anycast

None of this is free. Running anycast well means Cloudflare has to keep every data center capable of terminating any connection for any customer, since a router's path decision — not Cloudflare's application layer — decides where a given packet lands, and that decision isn't sticky in the way a load balancer's session affinity would be. That's part of why the config-propagation problem Quicksilver solves and the need for globally consistent edge software matter so much: anycast only works cleanly if every location genuinely is a peer of every other, running the same configuration and code.

## What you can borrow

- Anycast's core idea — let routing itself do the work of directing traffic to the nearest healthy instance — is a network-layer alternative to application-layer geo-routing, and it fails over for free when a location goes dark.
- Distributing the same identity across many locations turns a concentrated attack surface into a diffuse one; this applies to more than IP addresses.
- A technique that solves latency and a technique that solves resilience are sometimes the same technique — don't evaluate infrastructure choices on a single axis.
- Global uniformity (every location running identical configuration) is a prerequisite for techniques like anycast to work safely, not an optional nicety.
