---
title: "Cells and Shuffle Sharding: Amazon's Approach to Containing Blast Radius"
slug: "amazon-cell-based-architecture-shuffle-sharding"
description: "How AWS uses cell-based architecture and shuffle sharding to keep one customer's or one partition's failure from taking down everyone else."
publishedAt: "2025-10-29"
updatedAt: "2026-09-16"
category: "Amazon"
tags:
  - Engineering at Scale
  - Amazon
  - AWS
  - Reliability
---

A large multi-tenant service has a structural risk that's easy to underinvest in: if the whole fleet shares the same infrastructure, a bug, a bad deploy, or a single misbehaving customer's traffic pattern can, in the worst case, degrade the service for every customer at once. AWS's answer to that risk, documented across several of its Builder's Library articles, centers on two related ideas: cell-based architecture, which limits how much of the system any one failure can reach, and shuffle sharding, which limits how much any one customer's failure spreads to others.

## Cells: partition the whole system, not just the data

Cell-based architecture partitions a service into multiple independent, self-contained instances — cells — where each cell handles a subset of overall traffic or customers, and, critically, a failure inside one cell is contained to that cell rather than propagating to the whole fleet. This differs from ordinary horizontal scaling, which just adds more capacity to a shared pool without necessarily limiting how far a fault can spread through that pool. A router layer in front of the cells is deliberately kept as simple and reliable as possible, since it's the one component that does span all cells, and any bug there would defeat the whole point of cellular isolation.

The tradeoff cell-based architecture accepts is operational complexity — you now have many independent deployments to manage, monitor, and keep in sync — in exchange for a hard ceiling on blast radius: even a severe bug that takes an entire cell down only affects the fraction of customers assigned to that cell, not the whole service.

## Shuffle sharding: give every customer a unique combination of the blast radius

Cells alone still leave a question: if you have, say, eight cells and randomly assign customers to them, a bad cell still takes down every customer assigned to it — potentially a meaningful fraction of your customer base if cells are large. Shuffle sharding, an idea popularized by AWS engineer Colm MacCárthaigh, refines this by assigning each customer not to one shared cell but to a unique, randomized combination of resources drawn from a larger pool. With enough combinatorial possibilities, most customers end up with a shard combination that barely overlaps with any other given customer's combination.

The practical effect is that even when two customers are both affected by the same underlying resource failure, the overall set of customers who share both of two independent points of failure shrinks combinatorially, so a "noisy neighbor" or a resource-level failure tends to affect a small, mostly-unique slice of customers rather than a large shared block of them. This is the technique behind resilience improvements in services like Amazon Route 53, where shuffle sharding limits how many customers a DNS resolution problem can simultaneously impact.

## Isolation as a first-class design goal, not an afterthought

What ties cells and shuffle sharding together is a shared philosophy: assume failures will happen somewhere in the system regularly, and design the system's topology so failures stay small and contained rather than trying to prevent every possible failure outright. That's a meaningfully different posture from simply adding redundancy or trying to make each individual component more reliable — it accepts that perfect reliability isn't achievable and instead optimizes for how much damage an inevitable failure can do.

## What broke when they scaled

Cells fail at the seams. A shared cache, a global identity service, or a "temporary" cross-cell admin tool becomes the path that takes all cells down together. AWS Builders' Library pieces on blast radius keep returning to this: the router and any shared dependency must be simpler and more reliable than the cells, or cellular architecture is a drawing. Deployments are another seam — a pipeline that pushes to all cells at once defeats isolation; staggered, one-cell-first deploys are part of the design.

Shuffle sharding's combinatorics also have a cost. Customers mapped onto overlapping replica sets make capacity planning and "which hosts do we page" harder. Debugging a single customer's bad traffic means understanding a unique subset of the fleet. Colm MacCárthaigh's shuffle-sharding explanations (including Route 53's use) emphasize that you still need limits per shard so one customer cannot burn their entire replica set — isolation of assignment is not isolation of load.

Too many tiny cells increase toil: N times the dashboards, N times the schema migrations. Too few cells make each failure too large. The scaling work is picking N from customer-impact math, not from a slogan.

## A smaller-team version of the same idea

Split production into two independent stacks (even two Kubernetes namespaces with no shared Redis) and a dumb router: cookie, tenant id, or coin flip. Deploy to one first. If a tenant can ruin a shared worker pool, give them a shuffle of workers rather than the whole pool. You do not need Route 53's scale to get the idea. Avoid a "shared everything" cache in front of both stacks.

## What you can borrow

- Partition your system into independent cells if a single fault taking down 100% of traffic is unacceptable — even a handful of cells meaningfully caps blast radius.
- Keep whatever routing layer spans your cells as simple as possible; it's the one piece of infrastructure that can undo your isolation if it breaks.
- Consider shuffle sharding — randomized, overlapping-but-mostly-unique resource assignment — wherever "noisy neighbor" risk exists in a shared pool.
- Design explicitly for blast-radius containment, not just fault prevention; both matter, but only one of them bounds your worst case.
