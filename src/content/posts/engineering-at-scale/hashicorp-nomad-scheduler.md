---
title: "Nomad: A Scheduler That Treats Bin Packing as the Product"
slug: "hashicorp-nomad-scheduler"
description: "How HashiCorp Nomad scheduled jobs across a fleet with evaluations, allocations, and bin packing — without requiring a control plane that looks like a second operating system."
publishedAt: "2026-11-14"
updatedAt: "2026-11-14"
category: "HashiCorp"
tags:
  - Engineering at Scale
  - HashiCorp
  - Scheduling
  - Distributed Systems
sources:
  - title: "Nomad Scheduling"
    publisher: "HashiCorp"
    url: "https://developer.hashicorp.com/nomad/docs/concepts/scheduling/scheduling"
  - title: "Nomad Architecture"
    publisher: "HashiCorp"
    url: "https://developer.hashicorp.com/nomad/docs/concepts/architecture"
---

Cluster schedulers exist because "SSH and a process manager" does not survive a few hundred machines. Kubernetes won most of the mindshare by becoming a platform. Nomad's argument was narrower and, for a lot of HashiCorp shops, more honest: you already have Consul and Vault, you need something that places jobs, restarts them, and packs bins, and you may need to run VMs, containers, and Java jars on the same fleet without a custom resource definition for each.

## Jobs, evaluations, allocations

A Nomad job is a desired count of tasks grouped into task groups, with constraints (this kernel, this class of disk) and resources (CPU, memory). When a job is submitted or a node dies, the servers create an evaluation. The scheduler's job is to produce allocations: bindings of a task group to a client node. Servers, like Consul, use Raft. Clients are agents that run allocators and report resource fingerprints.

The interesting bit is the scheduler types. A service scheduler keeps a count healthy. A batch scheduler runs to completion. A system scheduler places a copy on every eligible node, which is how you spread log shippers without inventing DaemonSets in a second vocabulary. Bin packing versus spread is a policy, not a moral stance: packing raises utilization and blast radius; spreading lowers noisy-neighbor risk and wastes slots.

## Feasibility, ranking, and preemption

Nomad's placement loop is closer to a compiler than to a chatbot. It filters infeasible nodes (wrong attributes, not enough memory), ranks the rest (bin packing scores, affinities, anti-affinities), and picks. Preemption exists because a cluster that never evicts low-priority batch work will refuse production services at 3 a.m. for lack of a contiguous memory hole. That is a product decision encoded as priority classes.

Drivers — Docker, exec, qemu, Java — keep the scheduler from dictating a single packaging religion. That is why Nomad showed up in shops that had not finished a container migration and in shops that needed both. The cost is that "the cluster" is a thinner abstraction: networking and service identity are often Consul's problem, secrets Vault's, and Nomad is the placement engine. Teams who wanted one YAML object that means "service" sometimes found that honesty refreshing and sometimes found it incomplete.

## What goes wrong when the scheduler is "simple"

The failure mode is a job that asks for more memory than any node has, forever pending, while dashboards show idle CPU. Operators add nodes of the same size. The job still does not fit. Mid-size steal: fingerprint actual resources, set realistic maxima, and alert on blocked evaluations, not only on failed allocations.

Another gotcha is ignoring spread until a packed host's kernel takes every replica of a stateful service with it. Service jobs without spread constraints will happily stack. Client drain is how you do maintenance; skipping drain and killing a node is how you teach the scheduler about deaths the noisy way. Garbage collection of terminal allocations matters because the API and UI fill with history until "what is running" is archaeology. If you run Consul service registration from Nomad, a stale allocation that never deregisters becomes Consul's problem and then your users' problem. Treat stop and deregister as one story. Multi-region Nomad without thinking about where the job spec lives will place in the region you did not mean. Namespaces and ACLs are not optional once two teams share a cluster; the scheduler will pack their jobs onto the same disk either way.

## What you can borrow

- Model placement as evaluation plus allocation, and alert when evaluations cannot place, not only when tasks crash.
- Offer more than one scheduler policy (service, batch, system) instead of stretching a single replica controller into batch work.
- Make bin packing a default you can override with spread when loss of one host would drop every copy.
- Keep the scheduler thin if adjacent systems already do discovery and secrets; do not rebuild them inside job spec comments.
