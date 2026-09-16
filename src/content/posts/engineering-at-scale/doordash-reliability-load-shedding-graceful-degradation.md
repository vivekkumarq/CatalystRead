---
title: "Reliability Engineering for a Three-Sided Marketplace"
slug: "doordash-reliability-load-shedding-graceful-degradation"
description: "How DoorDash designs for graceful degradation and load shedding so a spike or partial outage on one side of its marketplace doesn't take down the rest."
publishedAt: "2026-01-15"
updatedAt: "2026-09-16"
category: "DoorDash"
tags:
  - Engineering at Scale
  - DoorDash
  - Reliability
  - Distributed Systems
---

DoorDash's platform has to keep three distinct groups happy simultaneously — consumers browsing and ordering, Dashers accepting and completing deliveries, and merchants receiving and fulfilling orders — and each group interacts with different services under different load patterns at different times. A dinner-rush spike in consumer order volume, a severe-weather event that strains Dasher supply, or a popular merchant suddenly going viral can each independently overload part of the system. Reliability engineering at DoorDash is largely about making sure that stress on one side of this marketplace degrades gracefully rather than cascading into an outage that hurts everyone.

## Not every request deserves equal protection under stress

A core idea behind load shedding is that under genuine overload, trying to serve every request at full quality guarantees serving none of them well — queues back up, latency spikes for everyone, and eventually the system falls over entirely. DoorDash's services are designed to recognize when they're approaching capacity and deliberately shed lower-priority load first, rather than treating every request as equally urgent. A request that's core to completing an in-progress order — confirming a Dasher's pickup, capturing a payment — gets protected ahead of a nice-to-have like a personalized recommendation module or a non-critical analytics call, which can be skipped or degraded without anyone's dinner being affected.

```text
Under normal load:  serve everything, full feature set
Under heavy load:   shed non-critical calls first
                     (recommendations, secondary analytics)
Under severe load:  protect only core order-completion path
                     (accept, pickup, payment, delivery confirmation)
```

## Circuit breakers to stop cascading failures

Because so many of DoorDash's services depend on each other — dispatch depends on Dasher location services, checkout depends on payment processing, search depends on catalog and inventory services — a single slow or failing dependency can quietly propagate delay throughout the whole call graph if callers keep waiting on it indefinitely. Circuit breakers address this by detecting when a downstream dependency is failing or responding too slowly, and short-circuiting further calls to it for a cooldown period, letting the calling service fail fast and fall back to a degraded response instead of piling up threads or connections waiting on a dependency that isn't going to answer in time.

## Graceful degradation as a product decision, not just an engineering one

Deciding what "degraded but functional" looks like for DoorDash's core flows requires product judgment as much as systems design — should search fall back to a simpler, less personalized ranking if the full ranking service is struggling, or should certain features be hidden entirely under load? These trade-offs get decided ahead of time, encoded into fallback behavior, rather than improvised during an actual incident, so that when load shedding does kick in, the resulting degraded experience is a deliberate, tested state rather than whatever happens to break first.

## Testing degradation before it's needed for real

Much like scheduled load testing at other companies, DoorDash's reliability practice includes deliberately inducing failure and overload conditions in controlled settings to confirm that load shedding, circuit breakers, and fallback behavior actually trigger and behave as designed, since untested resilience code is one of the more common ways a system fails precisely when it's needed most.

## What broke when they scaled

A three-sided marketplace fails asymmetrically. If Dasher tracking dies, consumers still order and restaurants still cook — then food sits. If the order-placement API dies, nobody cooks. Load shedding that drops random 10% of all traffic can drop checkout while keeping a recommendation carousel healthy, which is the wrong survival function. DoorDash's reliability writing emphasizes shedding the cheapest, least revenue-critical work first (extra personalization, nonessential banners) and protecting checkout, dispatch, and payment paths.

Cascades are the other break. A slow downstream (maps, notifications, fraud) without a deadline turns every thread into a wait. Circuit breakers and bulkheads are how you keep "ratings service sad" from becoming "cannot place order." Graceful degradation is a product spec: show last-known ETA, hide the live map, queue the SMS. That spec has to be tested with game days; it will not appear under unit tests.

Lunch and dinner spikes are predictable DDoS from your own customers. Autoscale that lags 10 minutes is an outage. Shed and degrade while capacity catches up.

## A smaller-team version of the same idea

List endpoints in priority order. Put timeouts on every RPC shorter than the user SLO. When concurrency hits a limit, fail the lowest-priority handler with a canned response. Practice turning off one noncritical feature. Do not require a service mesh to do this — a semaphore and a feature flag get you started.

## What you can borrow

- Rank your own requests or features by criticality ahead of time, so load shedding under real pressure has a clear priority order to follow instead of being improvised.
- Add circuit breakers around dependencies that can fail slowly, not just ones that fail outright — a hanging dependency is often more damaging than one that errors immediately.
- Decide what "degraded but working" looks like for your core flows in advance, as a deliberate design decision, not an incident-time improvisation.
- Regularly test your failure-handling code under simulated load; untested fallback paths tend to fail exactly when you need them.
