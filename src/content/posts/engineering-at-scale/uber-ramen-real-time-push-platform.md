---
title: "RAMEN: Replacing Polling With a Real-Time Push Platform"
slug: "uber-ramen-real-time-push-platform"
description: "How Uber built RAMEN, a persistent-connection push platform, to replace polling and cut latency and backend load across its rider and driver apps."
publishedAt: "2025-09-02"
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

## What you can borrow

- Polling intervals force a latency-versus-load tradeoff that push-based delivery avoids for event-driven data — reach for push whenever updates are irregular rather than genuinely periodic.
- Build persistent-connection infrastructure as shared platform, not a per-feature integration; connection management and delivery guarantees are hard enough that you want to solve them exactly once.
- Design explicitly for mobile network unreliability: reconnect handling and duplicate/loss semantics matter as much as the happy-path delivery latency.
- Route backend events to the right connection through a defined publish path, so any team's service can push updates without knowing the transport details.
