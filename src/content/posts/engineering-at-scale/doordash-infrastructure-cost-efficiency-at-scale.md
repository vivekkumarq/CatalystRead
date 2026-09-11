---
title: "Keeping Infrastructure Costs Sane While DoorDash Kept Growing"
slug: "doordash-infrastructure-cost-efficiency-at-scale"
description: "As order volume climbed, DoorDash treated infrastructure cost as an engineering metric teams could see and act on, not just a line on a finance report."
publishedAt: "2026-05-30"
category: "DoorDash"
tags:
  - Engineering at Scale
  - DoorDash
  - Cloud Infrastructure
  - Cost Optimization
  - Kubernetes
sources:
  - title: "DoorDash Engineering Blog"
    publisher: "DoorDash"
    url: "https://careers.doordash.com/blog"
---

Cloud infrastructure cost has a habit of scaling with traffic by default, and for a company growing as fast as DoorDash did, that default relationship becomes a real problem — a cost base that grows linearly with orders leaves no room for the cost efficiency that's supposed to come with scale. Treating infrastructure spend purely as a finance line item, reviewed quarterly after the fact, means engineers making day-to-day decisions never actually see the cost consequences of their choices. DoorDash's response was to pull cost into engineering itself, as a metric teams could see, measure, and act on directly, rather than something a separate team cleaned up after the bill arrived.

## Matching capacity to a lunch-and-dinner business

DoorDash's traffic isn't flat — it has pronounced peaks around lunch and dinner and meaningfully lower load overnight, which makes a fixed fleet sized for peak traffic wasteful for most of the day. Autoscaling compute, particularly on Kubernetes-based infrastructure, to track actual demand rather than provisioning statically for the worst case is one of the more direct levers available: capacity ramps up ahead of the dinner rush and scales back down overnight, instead of running a peak-sized fleet around the clock out of caution.

```text
Static fleet:   fixed capacity, sized for peak, idle overnight
Autoscaled:     capacity tracks real demand
                lunch/dinner peaks -> scale up
                overnight trough   -> scale down
```

## Making cost visible where engineering decisions actually happen

A cloud bill reviewed by finance at the end of the month tells you what happened, not what to do differently, and it certainly doesn't tell an individual engineer what their service costs relative to the value it delivers. DoorDash's approach leans on normalizing cost against a meaningful unit of business activity — cost per order, or cost per API call for a given service — and surfacing that metric to the teams who own the service, in the same dashboards and tools they already use for reliability and performance. A team that can see their own service's cost per order trending in the wrong direction has a concrete signal to act on, in a way an aggregate company-wide cloud bill never provides.

## Data infrastructure costs grow quietly

Compute is the most visible cost lever, but data infrastructure — event streams, logs, analytics warehouses — tends to grow in step with the business and can quietly become just as significant if left unmanaged. Retention policies on high-volume data like event logs and Kafka topics, along with tiering storage so that older, less-frequently-accessed data moves to cheaper storage classes rather than sitting in expensive hot storage indefinitely, are the less glamorous but consequential parts of a cost efficiency effort at this scale.

### Reserved and spot capacity for predictable workloads

For workloads with predictable, steady baseline demand, committing to reserved capacity ahead of time is meaningfully cheaper than paying on-demand rates continuously, while more elastic, interruption-tolerant workloads can lean on spot capacity for further savings. Getting this mix right requires actually understanding which workloads are steady-state versus bursty — a classification that has to be revisited as traffic patterns and the service catalog both keep changing.

## What you can borrow

- Autoscale capacity to match your actual demand curve rather than provisioning statically for peak load around the clock.
- Normalize infrastructure cost against a real unit of business activity and put that metric in front of the engineers who own the relevant service.
- Review data retention and storage tiering regularly; data infrastructure costs grow quietly and are easy to overlook next to compute.
- Match reserved versus on-demand versus spot capacity to how predictable each workload's demand actually is, and revisit that classification as traffic patterns change.
