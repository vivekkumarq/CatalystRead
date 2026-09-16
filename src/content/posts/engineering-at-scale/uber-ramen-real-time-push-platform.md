---
title: "RAMEN: Replacing Polling With a Real-Time Push Platform"
slug: "uber-ramen-real-time-push-platform"
description: "How Uber built RAMEN, a persistent-connection push platform, to replace polling and cut latency and backend load across its rider and driver apps."
publishedAt: "2025-09-02"
updatedAt: "2026-09-16"
category: "Uber"
tags:
  - Engineering at Scale
  - Uber
  - Real-Time Systems
  - Mobile Infrastructure
sources:
  - title: "Uber Engineering Blog"
    publisher: "Uber"
    url: "https://www.uber.com/blog/engineering/"
---

A ride-hailing app lives and dies on freshness: a driver's position needs to update on the rider's map within a second or two, a trip status change needs to reach both parties almost immediately, and pricing or ETA updates need to feel live rather than stale. Uber's early approach to keeping app state fresh, like a lot of mobile apps of that era, leaned on polling — clients periodically asking the backend "anything new?" on a fixed interval. Polling is simple to build and reason about, but it forces an unpleasant tradeoff: poll frequently and you burn backend capacity and battery on mostly-empty responses, poll infrequently and updates feel laggy. At Uber's request volume, that tradeoff became expensive in both directions at once. RAMEN was Uber's answer: a platform for pushing updates to clients over persistent connections instead of clients repeatedly asking for them.

## Push instead of ask

The core shift RAMEN represents is inverting who initiates an update. Instead of a rider's app asking the backend for the driver's latest position every few seconds regardless of whether it changed, the backend holds a persistent connection to the client and pushes a message the moment there's something new to send. That's a strictly better use of both network and server resources when updates are irregular and event-driven — which trip and driver-location updates fundamentally are — rather than continuous at a fixed frequency. It also directly improves the user-facing latency for anything that matters in real time, since an update reaches the client as soon as it happens rather than waiting for the next poll interval to roll around.

## The plumbing behind "just push it"

Making that shift work at Uber's scale required solving problems that a polling model mostly avoids by construction: maintaining large numbers of concurrent persistent connections efficiently, routing a given backend event to the specific connection (or connections) belonging to the right rider or driver, handling connection drops and reconnects gracefully on unreliable mobile networks without losing or duplicating updates, and doing all of this without the push infrastructure itself becoming a new bottleneck or single point of failure sitting in front of every real-time interaction in the app. RAMEN was built as shared infrastructure specifically so individual product teams didn't each need to solve connection management and delivery guarantees themselves for every feature that needed real-time updates.

## A platform, not a one-off feature

Because Uber's real-time needs weren't limited to one screen or one feature — driver location, trip status, pricing changes, and later a growing set of live in-app notifications all needed the same underlying delivery mechanism — RAMEN was built as a general-purpose push platform that other teams' services could publish events into, rather than a special-cased pipe for any single use case. That let new features get real-time delivery essentially for free once RAMEN existed, instead of every team re-solving connection management, fan-out, and mobile network reliability from scratch.

## What a mid-size team can steal from Ramen

Ramen-style push delivers trip updates to phones without the app hammering HTTP. The failure mode is a websocket or FCM fan-out that still originates from every microservice directly, recreating N-squared connections. Mid-size steal: one push gateway, server-side subscriptions by user or trip id, and payload budgets so a chatty service cannot blow mobile radios.

The concrete failure mode is offline buffering that replays stale offers — a ride that was already accepted — because the client applied events without version checks. Sequence numbers per topic. Operational gotcha: presence and push mixed on one connection; a blip in presence storms the gateway. Split. Multi-region: a user hands off from cell tower to Wi-Fi and lands on another POP with a different cache of the trip. The source of truth must be the trip service, with the gateway as a projection. Auth tokens on long-lived connections expire; silent 401s look like "Uber is stuck." Refresh in-band. If you cannot build Ramen, FCM/APNs plus a small payload and a fetch-on-wake is enough for many products. Steal the idea that the phone is not a poller. Do not steal a custom protocol until a vendor channel is the measured limiter. Watch fan-out to a city-scale event (an airport outage) as the load test, not a single trip.

## What you can borrow

- Polling intervals force a latency-versus-load tradeoff that push-based delivery avoids for event-driven data — reach for push whenever updates are irregular rather than genuinely periodic.
- Build persistent-connection infrastructure as shared platform, not a per-feature integration; connection management and delivery guarantees are hard enough that you want to solve them exactly once.
- Design explicitly for mobile network unreliability: reconnect handling and duplicate/loss semantics matter as much as the happy-path delivery latency.
- Route backend events to the right connection through a defined publish path, so any team's service can push updates without knowing the transport details.
