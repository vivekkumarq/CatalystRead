---
title: "How DoorDash Streams a Dasher's Location to Your Phone in Real Time"
slug: "doordash-real-time-delivery-tracking-geospatial"
description: "Behind DoorDash's live delivery map is a pipeline that balances Dasher battery life against location freshness across millions of concurrent deliveries."
publishedAt: "2025-07-14"
updatedAt: "2026-09-16"
category: "DoorDash"
tags:
  - Engineering at Scale
  - DoorDash
  - Geospatial
  - Real-Time Systems
  - Mobile
sources:
  - title: "DoorDash Engineering Blog"
    publisher: "DoorDash"
    url: "https://careers.doordash.com/blog"
---

Watching a small car icon glide across a map toward your address is one of the most reassuring parts of ordering delivery, and it looks simple from the consumer side — a dot moves, an ETA counts down. Underneath, DoorDash has to continuously collect location data from Dasher phones, push it through a backend pipeline, and fan it out to exactly the right customer's app, all within a couple of seconds, across a fleet of Dashers making millions of deliveries at once. The engineering challenge is less about any single piece of that pipeline and more about the trade-offs at every layer: how often to ask a Dasher's phone for its location, how to route that update to the one customer who needs it, and how to make a stream of discrete GPS pings look like smooth motion on a map.

## Location freshness versus battery life

The most basic tension in the system is that more frequent GPS pings mean a more accurate, up-to-date position on the map, but GPS polling and network transmission both drain a Dasher's phone battery — a real cost for someone who may be on shift for hours. DoorDash's approach is to vary the ping frequency based on context rather than polling at a single fixed rate: a Dasher who's actively en route to a drop-off with an order in hand needs more frequent updates than one who's idle waiting for a new assignment, since the active delivery leg is exactly when a customer is watching the map most closely and precise ETAs matter most.

## Getting updates to the right customer, not everyone

At any given moment, DoorDash has a huge number of deliveries in flight simultaneously, but each customer only cares about their own Dasher's location. That means the system can't simply broadcast every location update to every connected client — it has to route each Dasher's position updates specifically to the customer (and merchant, where relevant) tracking that particular delivery. This kind of targeted fan-out, scoped to an individual order rather than broadcast platform-wide, is what keeps the pipeline's bandwidth and server load proportional to active deliveries rather than to the whole user base.

```text
Dasher app --location ping--> backend ingestion
                                    |
                         route by active order_id
                                    |
                     push to that order's customer app
                     (and merchant app, where relevant)
```

## Smoothing raw GPS into a believable path

Raw GPS coordinates arriving every few seconds would make the map marker visibly jump from point to point rather than glide, so the client side of the experience interpolates between received positions, animating the marker smoothly along a plausible path rather than snapping it directly to each new raw coordinate. This is a purely presentational layer sitting on top of the raw data pipeline, but it matters enormously for how trustworthy the tracking experience feels to a customer watching it.

## ETAs that update as reality changes

The live location feed doesn't just drive the map — it also feeds back into the delivery's estimated arrival time, which recalculates as a Dasher's actual position and current traffic conditions diverge from the original estimate made when the order was first assigned. An ETA that never updates once a Dasher is on the road quickly loses a customer's trust the first time it turns out to be wrong.

## What broke when they scaled

Phone GPS at 1 Hz for every Dasher is a battery and bandwidth tax, and a map that jumps 80 meters because of a canyon of buildings destroys trust. DoorDash has to sample location based on speed and proximity to pickup/dropoff — denser near the restaurant and the customer, sparser on a highway — and then smooth. Raw points are not a product.

Fan-out is the Discord presence problem with a moving point: only the consumer (and maybe the merchant) for *this* delivery should get updates, not a city-wide broadcast. A pub/sub keyed by delivery id, with the consumer's app subscribed for the order's lifetime, keeps the firehose bounded. Millions of concurrent deliveries still mean a geospatial index for "Dashers near this store" for dispatch, which is a different query than "tell this one phone the next lat/lng."

ETA is a model sitting on noisy GPS, traffic, and parking. If the map shows a Dasher two blocks away while ETA says 20 minutes, users believe neither. The tracking pipeline and the ETA service have to share a world model, or at least not contradict it in the UI.

## A smaller-team version of the same idea

Ping location every few seconds near destination, every 15–30s otherwise. Push to the one client via websocket or FCM. Snap to roads if you must, but never invent a path through a river. Compute ETA from remaining distance plus a simple speed prior. Add map-matching when users complain about teleporting pins, not before.

## What you can borrow

- Vary the frequency of any expensive client-side operation (GPS polling, sensor reads) based on context, rather than polling at one fixed rate everywhere.
- Route real-time updates specifically to the consumers who need them instead of broadcasting to everyone connected.
- Smooth or interpolate sparse real-world data on the client before displaying it; raw discrete updates often look worse than they need to.
- Recompute downstream estimates like ETAs continuously as new ground-truth data arrives, rather than treating an initial estimate as fixed.
