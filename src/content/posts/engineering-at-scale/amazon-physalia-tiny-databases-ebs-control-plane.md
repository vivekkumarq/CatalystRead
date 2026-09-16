---
title: "Physalia: Why EBS Runs Millions of Tiny Databases Instead of One Big One"
slug: "amazon-physalia-tiny-databases-ebs-control-plane"
description: "How AWS's EBS team solved a control-plane consistency problem by giving every volume its own small, independently placed replicated database."
publishedAt: "2025-11-14"
updatedAt: "2026-09-16"
category: "Amazon"
tags:
  - Engineering at Scale
  - Amazon
  - Distributed Systems
  - Storage
sources:
  - title: "Millions of Tiny Databases"
    author: "Marc Brooker, Tao Chen and Fan Ping"
    publisher: "NSDI 2020"
---

Amazon Elastic Block Store needs to track, for every single volume, which server it's currently attached to and how its data is configured — information that has to stay correct even while servers fail, volumes move, and the fleet keeps growing. The obvious approach is a shared database or coordination service that holds this configuration data for every volume. The problem is that a single shared system, however well built, becomes both a scaling bottleneck as EBS grows and a shared failure domain — a bug, an overload event, or an availability issue in that one system can affect configuration lookups for volumes that have nothing to do with each other. EBS needed strong consistency per volume, but explicitly did not need — and did not want — a single system coupling every volume's fate to every other volume's.

## One database per volume, not one database for all volumes

Physalia's answer, described in a 2020 NSDI paper by the EBS team, inverts the usual instinct. Instead of scaling up one big consistent data store, Physalia creates an enormous number of tiny, independent replicated databases — one per EBS volume — each running its own instance of a Paxos-based consensus protocol among a small set of nodes. Each of these tiny databases only ever needs to agree on configuration for a single volume, so the consensus group is small, the state is small, and a problem in one volume's database has essentially no way to affect any other volume's database, because they don't share infrastructure, state, or a coordination boundary beyond the placement service that creates them.

This is a deliberate rejection of the "one bigger, more heavily engineered system" instinct. A giant, exquisitely tuned distributed database is still one system, and one system is still one blast radius. Physalia gets its resilience not from making any individual database more robust, but from making the failure of any one of them matter as little as possible to everyone else.

## Placement that understands the network, not just node health

The genuinely novel part of Physalia isn't running many small Paxos groups — that's a natural enough idea — it's how Physalia decides where to place the handful of replicas for each volume's database. Placement is deliberately aware of the AWS network topology and of correlated failure domains, so that the replicas backing any one volume's database are spread across infrastructure that's unlikely to fail together, and so that no single piece of shared infrastructure ends up hosting a disproportionate concentration of "leader" replicas whose simultaneous loss would create an outsized impact. That placement logic is what lets Physalia turn "millions of tiny databases" from a chaotic sprawl into a system whose aggregate failure behavior is actually predictable and bounded.

## Consensus, sized to the problem

The broader lesson Physalia embodies is that consensus and strong consistency don't have to be applied at the scale of an entire system just because the system is large. EBS's actual consistency requirement lives at the granularity of a single volume — two different volumes never need to agree on anything with each other — so Physalia matches its unit of consensus to that requirement exactly, rather than defaulting to a single control plane sized for the whole fleet because that's the more conventional architecture.

## What broke when they scaled

A shared control-plane database looks cheaper until an availability event or a hot partition on "volumes in this AZ" serializes the fleet. EBS attach/detach is a consistency-sensitive operation: two instances must not believe they own the same volume. That invariant is per volume, which is why Physalia's "Millions of Tiny Databases" design matches consensus to the object. The scaling break of the *old* instinct is correlated load — storms of attaches after an AZ recovery — slamming one coordinator.

Tiny databases create a different problem: you now operate a placement and lifecycle service for millions of Paxos groups. Leaders need to be spread so a rack loss does not simultaneously stall a huge fraction of volumes whose control records lived together. The NSDI paper emphasizes topology-aware placement for that reason. You also need a story for creating, migrating, and destroying these mini-databases without a thundering herd on the placement plane — otherwise you reintroduced a single choke point one layer up.

Debugging gets stranger. There is no one admin console of "the" metadata. Observability has to be indexed by volume id, with sampling, because you cannot scrape millions of consensus groups at Prometheus cardinality. That operational shape is the tax of shrinking blast radius.

## A smaller-team version of the same idea

Do not run Paxos per row on day one. Do shard control data so unrelated tenants or objects do not share a lock, a queue, or a failover domain. A hash of `resource_id` onto a handful of metadata databases, plus a rule that attach leases live with the resource, captures Physalia's intent. Keep a really simple router. Invest in placement only when you have seen correlated failures. If your entire control plane fits in one Postgres primary and your blast radius is acceptable, stay there — and write down the day you will split.

## What you can borrow

- Match your unit of consistency to the actual scope of the problem — if two pieces of data never need to agree with each other, don't force them through the same coordination system.
- Many small, independent, failure-isolated components can be more resilient in aggregate than one larger, more heavily engineered shared system.
- When placing replicas for isolation, reason explicitly about correlated failure domains and network topology, not just simple node-count redundancy.
- Be willing to reject the instinct to scale up a single system; sometimes the right move is to scale out the number of independent systems instead.
