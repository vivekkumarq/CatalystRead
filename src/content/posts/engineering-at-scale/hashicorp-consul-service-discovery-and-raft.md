---
title: "Consul: Cataloguing Services With Gossip at the Edge and Raft at the Core"
slug: "hashicorp-consul-service-discovery-and-raft"
description: "How HashiCorp Consul combined Serf gossip for membership with a Raft-backed catalog so services could find healthy peers without a shared hosts file."
publishedAt: "2026-11-11"
updatedAt: "2026-11-11"
category: "HashiCorp"
tags:
  - Engineering at Scale
  - HashiCorp
  - Service Discovery
  - Distributed Systems
sources:
  - title: "Consul Architecture"
    publisher: "HashiCorp"
    url: "https://developer.hashicorp.com/consul/docs/architecture"
  - title: "Raft Consensus in Consul"
    publisher: "HashiCorp"
    url: "https://developer.hashicorp.com/consul/docs/architecture/consensus"
---

Before Consul, a surprising number of production fleets still answered "where is checkout?" with a config file, a load-balancer VIP, or DNS that someone remembered to update after a deploy. That works until instances appear and disappear faster than the file can be edited, health checks live in a different system than the address book, and a stale IP quietly absorbs traffic after a host dies. HashiCorp's answer was not a smarter spreadsheet. It was a cluster that treats service identity, health, and location as first-class, replicated state.

## Two protocols, two jobs

Consul splits a problem that looks like one problem into two. Agent-to-agent membership and failure detection ride on a gossip layer derived from Serf: nodes learn about other nodes quickly, without every heartbeat traveling through a central bottleneck. The service catalog — which services exist, which instances are passing checks, which tags and metadata they carry — is a different contract. Clients need a consistent answer, not a rumor. Consul servers therefore form a Raft group per datacenter and commit catalog updates through a leader.

That split is the design, not an implementation accident. Gossip is a good way to notice that a host vanished. Raft is a good way to decide that an instance is registered, deregistered, or marked critical, and to make that decision survive a server restart. Mixing the two into a single all-gossip catalog would make "who is healthy?" a function of who you asked. Mixing them into a single all-Raft membership mesh would make join and leave chatter expensive.

## Health is part of discovery

A catalog that lists addresses without health is how you route to corpses. Consul agents run checks locally — process, HTTP, TCP, TTL — and report status into the catalog. Queries can ask for passing instances only. DNS and HTTP interfaces sit on top of the same data, so an application that only knows how to resolve a name still gets a filtered set. Intentions and later service mesh pieces layered onto this same identity, but the original insight is smaller: discovery that ignores liveness is a distributed hosts file with extra steps.

WAN gossip and prepared queries exist because datacenters are not one flat LAN. Consul's model is a datacenter as a Raft domain, with coarser federation across them, rather than one global consensus group that has to wait on every ocean.

## What breaks when you treat Consul as DNS-plus-magic

Teams import Consul, point every microservice at `service.consul`, and skip the operator's half of the design. The concrete failure is a Raft cluster of three servers sharing a rack, or five servers that are also running the application workload, so a noisy neighbor stalls the leader. Catalog writes stop; DNS still answers from stale cache; on-call concludes "DNS is fine" while registrations freeze.

Another gotcha is TTL checks that applications forget to heartbeat when a thread pool saturates. The instance is alive enough to fail a deploy and dead according to the catalog. Critical services then flap, and watchers thrash load balancers. Mid-size steal: keep servers dedicated, snapshot and restore the Raft data directory on purpose, and treat anti-entropy as a feature you can break with clock skew and split brains you created in "dev." Gossip intervals that are too aggressive on lossy networks produce false deaths; intervals that are too slow leave traffic on a dead box. Measure both. Do not put the KV store in the request path of every checkout because it was convenient. The catalog is for location and health, not your shopping cart.

## What you can borrow

- Separate failure detection (cheap, eventually consistent membership) from the source of truth clients query for "who may receive traffic."
- Put health in the same system as discovery so stale addresses cannot stay first-class citizens.
- Run consensus servers as a small, boring, dedicated set; do not colocate Raft with the hottest app process.
- Expose the catalog through the interfaces teams already have (DNS, HTTP) instead of requiring a new client library on day one.
