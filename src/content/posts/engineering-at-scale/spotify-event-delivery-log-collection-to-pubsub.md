---
title: "From Log Files to Cloud Pub/Sub: Spotify's Event Delivery Evolution"
slug: "spotify-event-delivery-log-collection-to-pubsub"
description: "How Spotify's event pipeline evolved from batch log collection off servers to a real-time, cloud-native Pub/Sub system serving hundreds of consuming teams."
publishedAt: "2026-04-19"
category: "Spotify"
tags:
  - Engineering at Scale
  - Spotify
  - Data Engineering
  - Event Streaming
---

Every action a Spotify user takes — a track played, skipped, added to a playlist — is an event that dozens of downstream systems care about: recommendation models, royalty accounting, product analytics, and A/B test evaluation, among many others. How those events get from the client and backend services that produce them to the systems that consume them is a deceptively hard infrastructure problem, and Spotify's approach to it changed substantially as the company scaled, moving through several architectural generations documented in its engineering blog over the years.

## Starting from batch log collection

Spotify's earliest event pipeline was much closer to traditional log collection than to real-time streaming: services wrote events to local log files, and a collection process periodically gathered those files and moved them into central storage for batch processing. This was simple to build and matched the batch-oriented analytics needs of the time, but it came with meaningful latency — events could be hours old before they were available for analysis — and the collection process itself became an operational burden to keep reliable as the number of producing services grew.

## Moving toward real-time streaming

As more of Spotify's product depended on fresher data — recommendations that reacted to what a user had just done, rather than what they'd done the previous day — batch collection stopped being good enough. Spotify built out event delivery systems designed around streaming rather than periodic batch pickup, so events became available to consumers within seconds rather than hours. This shift wasn't just a latency improvement; it changed what kinds of product features were even feasible to build, since anything relying on near-real-time signals had previously been ruled out by the pipeline's inherent lag.

## Standardizing on Cloud Pub/Sub after the GCP move

Spotify's broader migration to Google Cloud gave the event pipeline a natural next step: adopting Google Cloud Pub/Sub as the backbone for event delivery, replacing more bespoke, self-managed pieces of the earlier pipeline with a managed service. This reduced the operational burden of running event transport infrastructure themselves and let Spotify's data platform team focus more on the parts of the pipeline that were genuinely Spotify-specific — schema management, routing conventions, and making event streams easy for hundreds of internal teams to both produce to and consume from safely — rather than on keeping a message transport layer alive.

## What you can borrow

- Batch log collection is a reasonable, simple starting point for event delivery, but revisit it deliberately once product features start depending on lower latency than a collection cycle can provide — don't let it become the default by inertia.
- A move to managed cloud infrastructure is often most valuable in the pieces of your stack that are undifferentiated — message transport is rarely the place your product actually differentiates, so buying it can free real engineering time for the parts that are.
- As the number of teams producing and consuming events grows, invest deliberately in schema and routing conventions — that governance layer matters more at scale than the transport mechanism underneath it.
- Match your pipeline's latency characteristics to what your product features actually need; hours-old data is fine for some analytics, disqualifying for others.
