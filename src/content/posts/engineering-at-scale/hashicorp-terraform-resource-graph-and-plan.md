---
title: "Terraform's Plan: A Dependency Graph You Can Read Before You Break Production"
slug: "hashicorp-terraform-resource-graph-and-plan"
description: "How Terraform turned infrastructure changes into a directed graph of resources with an explicit plan step, so apply is not a surprise."
publishedAt: "2026-11-13"
updatedAt: "2026-11-13"
category: "HashiCorp"
tags:
  - Engineering at Scale
  - HashiCorp
  - Infrastructure as Code
  - Platform Engineering
sources:
  - title: "Resource Graph"
    publisher: "HashiCorp"
    url: "https://developer.hashicorp.com/terraform/internals/graph"
  - title: "Terraform Plan"
    publisher: "HashiCorp"
    url: "https://developer.hashicorp.com/terraform/cli/commands/plan"
---

Clicking through a cloud console does not scale past a handful of engineers, but naïve scripts that create resources in a fixed order fail in a more interesting way: they cannot tell you what they will destroy, they cannot converge after a partial failure, and they cannot express "this subnet must exist before this instance." Terraform's core trick is not HCL syntax. It is a graph of resources plus a plan that walks that graph against remote state and prints the delta before anyone types apply.

## Desired state, not a shell script with extra steps

A Terraform configuration describes objects and the references between them. Those references become edges: an instance depends on a subnet, a record depends on a load balancer address. Terraform builds a directed acyclic graph, walks it in topological order, and can parallelize independent subgraphs. Providers implement CRUD against APIs; the core does not need to know what an AWS security group is, only that it is a node with attributes other nodes may interpolate.

State is the memory of what Terraform last believed it created. Without state, every run is a guessing game against a live account full of objects named by humans. With state, plan is a three-way diff: configuration, state, and (when refreshed) reality. That is why a plan can say "this will replace," which is the sentence that saves a database. It is also why a corrupted or shared state file is an outage class of its own.

## Plan is a social protocol

The engineering culture around Terraform at companies that do not regret it is: no apply without a reviewed plan, and no plan that was generated against a different state than the apply. Remote backends, state locking, and CI that posts the plan on the pull request exist because local state on a laptop is a fork of production. Workspaces and separate states per environment exist because one graph that contains staging and prod is how a `-target` flag becomes folklore.

Modules are how graphs stay readable. They are not a package manager for cloud resources; they are a boundary so a team can take a subgraph, version it, and not paste forty resource blocks into every repo. The graph still flattens at plan time. Cycles — A referring to B referring to A — are rejected because the real world sometimes has them (load balancer and autoscaling group pointing at each other) and Terraform wants an explicit `depends_on` or a split, not a hang.

## Failure modes of graphs and plans

The concrete failure is apply of a stale plan after someone else applied, or `-auto-approve` in a pipeline that cannot render the plan for humans. Another is using `create_before_destroy` and `prevent_destroy` as decorations instead of as a response to a specific replacement. Terraform will replace a resource that changed an immutable attribute; if that resource is a stateful node, you needed a migration protocol, not a nicer graph.

Operational gotcha: the graph is only as good as the provider's idea of drift. An out-of-band console change looks like Terraform should revert it — unless the team has been applying with targeted resources and the rest of the graph is fiction. Mid-size steal: one state per blast radius, lock it, refresh in CI, and forbid apply from engineer laptops for prod. `terraform import` after a panic-created resource is cheaper than a second cluster. Secrets in state are still secrets; if you stuffed a database password into a resource attribute, the plan output and the state snapshot are now credential stores. Treat state like a backup of infrastructure identity, and keep payload secrets in a vault.

## What you can borrow

- Model infrastructure as a dependency graph and refuse to apply until a plan makes replacements explicit.
- Store state remotely with locking; a laptop copy is a divergent universe.
- Split state by blast radius so a bad apply cannot walk into an unrelated system.
- When a change is a replace of stateful infrastructure, design the migration outside the graph instead of hoping the provider's update is in-place.
