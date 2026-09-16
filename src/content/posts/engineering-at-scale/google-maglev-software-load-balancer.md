---
title: "Maglev: Google's Load Balancer That Replaced Hardware With Software"
slug: "google-maglev-software-load-balancer"
description: "How Google's Maglev system moved network load balancing off specialized hardware and onto commodity servers without sacrificing speed or reliability."
publishedAt: "2026-01-06"
updatedAt: "2026-09-16"
category: "Google"
tags:
  - Engineering at Scale
  - Google
  - Networking
  - Distributed Systems
sources:
  - title: "Maglev: A Fast and Reliable Software Network Load Balancer"
    author: "Daniel E. Eisenbud et al."
    publisher: "NSDI 2016"
    url: "https://research.google"
---

Before Maglev, load balancing traffic into Google's services meant relying on specialized hardware load balancers — appliances purpose-built for the job, but expensive, limited in throughput ceiling, and awkward to scale the same elastic way Google scaled everything else in its infrastructure. Adding capacity meant buying more physical boxes, which doesn't match how a company running on commodity servers and software-defined everything else wants to operate. Google needed a load balancer that could run on the same kind of commodity hardware as the rest of its fleet, scale horizontally by adding more machines, and still handle Google-scale traffic without becoming the bottleneck in front of every service. The result, described in the 2016 NSDI paper "Maglev: A Fast and Reliable Software Network Load Balancer," was a software load balancer that could match or beat purpose-built hardware.

## Consistent hashing that survives topology changes

Maglev's central technical contribution is a specific consistent-hashing scheme designed to solve a problem ordinary consistent hashing handles poorly: when the set of backend servers changes (one gets added, one gets removed, one fails), you want connections to be redistributed minimally and, critically, you want every Maglev instance in the fleet to independently compute the same mapping from packet to backend without needing to coordinate with each other on every change. Maglev builds a lookup table for each backend pool where each backend gets a roughly equal share of table slots, computed so the assignment is both balanced and stable — small changes to the backend set only move the minimum necessary set of connections rather than reshuffling everything.

This matters enormously for connection-oriented traffic: if a load balancer randomly reassigns which backend serves a given client's requests every time the backend set changes even slightly, you get gratuitous connection resets and broken persistent connections. Maglev's consistent-hashing table keeps that disruption close to the theoretical minimum.

## Direct Server Return and packet-level throughput

To handle Google's traffic volumes without the load balancer itself becoming a throughput bottleneck, Maglev uses Direct Server Return: the load balancer handles inbound packets and routes them to the chosen backend, but the backend sends response traffic directly back to the client rather than routing it back through the load balancer. Since responses are frequently much larger than requests (think a large page or video response to a small HTTP request), this removes the dominant share of traffic volume from ever needing to pass back through Maglev, letting a fleet of commodity Maglev machines handle traffic levels that would otherwise require substantially more hardware load-balancing capacity.

Maglev instances run in an active-active configuration across many machines, with each instance capable of handling the full range of traffic independently, so the system scales by adding more commodity Maglev machines rather than by buying bigger specialized appliances, and tolerates individual instance failures without a special failover mechanism since any healthy instance can serve any connection.

## What broke when they scaled

Hardware load balancers do not grow with a fleet of commodity servers, and they are a vendor-shaped bottleneck. Maglev (NSDI 2016, Eisenbud et al.) is a software L4 load balancer on Linux servers using consistent hashing so backend pool changes do not reshuffle every flow. Direct Server Return (DSR) keeps return traffic off the Maglev machine so the balancer is not the bandwidth bottleneck.

What breaks software LBs is connection tracking state, Maglev-hash polarization, and backend draining. If the hash is unstable, TCP connections reset when a balancer or backend dies. Maglev's paper is explicit about the hash and about packet processing in userspace-ish fast paths. At datacenter scale you also need ECMP into a Maglev cluster so the balancers themselves are not single boxes.

VIP ownership, health checking, and "this packet's 5-tuple" are the mechanics; fancy L7 belongs elsewhere (often on the backend or a proxy tier).

## A smaller-team version of the same idea

Use cloud LBs or HAProxy/Envoy. Enable consistent hashing if you have sticky caches. Do not buy a hardware ADC for a startup. If you run your own, Maglev's lesson is: hash flows stably, keep the balancer out of the return path if you can, health-check backends, drain before kill.

## What you can borrow

- Software load balancers on commodity hardware can match specialized appliances if you're deliberate about the hashing and packet-handling design — you don't automatically need purpose-built hardware for line-rate performance.
- When your backend set changes, measure and minimize connection churn, not just correctness — a hashing scheme that reshuffles everything on small changes creates unnecessary reliability problems.
- Direct Server Return (or equivalent asymmetric routing patterns) can remove your load balancer from the data path for the traffic direction that actually dominates bandwidth.
- Active-active designs, where every instance can serve any request, avoid the failover complexity and latency spikes of active-passive load balancer setups.
- Consistent hashing is a general tool worth knowing well beyond load balancing — anywhere you're mapping keys to a changing set of servers, minimal-disruption hashing pays off.
