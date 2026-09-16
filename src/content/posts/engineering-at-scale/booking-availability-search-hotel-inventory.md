---
title: "Hotel Availability at Booking.com: Search That Must Not Sell a Room Twice"
slug: "booking-availability-search-hotel-inventory"
description: "How Booking.com's availability search combines cached hotel inventory, partner feeds, and last-minute checks so a search result still has a room at checkout."
publishedAt: "2026-12-03"
updatedAt: "2026-12-03"
category: "Booking.com"
tags:
  - Engineering at Scale
  - Booking.com
  - Search
  - Distributed Systems
sources:
  - title: "Booking.com Engineering"
    publisher: "Booking.com"
    url: "https://medium.com/booking-com-engineering"
  - title: "Connectivity and availability"
    publisher: "Booking.com"
    url: "https://partner.booking.com"
---

Hotel search looks like web search until the document is a room-night that can vanish while the user reads the page. Booking.com sits on a mix of hotels it represents, channel managers, and other OTAs' connectivity. Availability is a distributed, delayed, sometimes lying dataset. The engineering job is to make search fast enough to type-ahead across the world, accurate enough that checkout does not bounce, and honest enough that partners do not get overbooked into a support crisis.

## Indexes of possibility versus truth at book

A common pattern in travel is a fast path that filters hotels likely to have a room — a cached availability index, rate caches, geo and filter predicates — and a slower confirmation at property page or checkout against a more live source. If you hit the partner for every search keystroke, the partner falls over and you are rate-limited. If you never hit the partner, you sell ghosts. Booking-scale systems keep a derived index with TTLs that vary by how volatile the property is (a 2,000-room resort on a Tuesday vs. a 3-room B&B on New Year's Eve).

Rates and restrictions (min stay, closed to arrival) are part of availability. A room that exists but cannot be booked for that stay is a miss, not a hit. Search that ignores restrictions is a pretty grid of 404s.

## Fanout, geo, and the long tail of properties

Queries are geo + dates + occupancy + filters. The index is sharded by geography or property id. Fanout to too many shards for a "Europe" query is a latency tail. Coarse-to-fine geo and pre-aggregation help. Personalization and ranking sit on top; they must not promote sold-out properties because the ranker is fresher than availability.

Overbooking policy is a business rule encoded in software. Some partners allow it; some do not. The platform has to know which truth it promised the traveler. Idempotent booking requests and holds (temporary allotments) reduce double sales when two users click the last room. Holds expire. Expiry races are the incident.

## Failure modes of inventory search

The concrete failure is a cache stampeded at a flash sale: every node misses, every node calls the channel manager, the manager times out, search shows empty or shows everything. Mid-size steal: stale-while-revalidate for search, reserved concurrency to partners, and serving slightly stale "available" with a hard check before payment.

Operational gotcha: date-boundary bugs around timezones and hotel local midnight. A room "available tonight" depends on whose clock. Another is occupancy: a search for 3 adults in a room that sleeps 2 should not appear, but extra-bed rules are partner-specific. Wrong occupancy filters create checkout failures that look like payments bugs. Connectivity outages should degrade a property to "check rates" rather than to a confident yes. Measure look-to-book and cancellation after book as quality, not only search p99. If you rebuild the availability index from a nightly dump, you will lie all afternoon. Incremental updates and partner push matter. Test a double-click on the last room from two datacenters. That is the actual product.

## What you can borrow

- Split fast cached search from a confirmatory live check before money moves.
- Protect partner APIs with concurrency limits; search traffic is not their capacity plan.
- Encode restrictions and occupancy in the index, not only "rooms > 0."
- Use short holds with expiry for last-room races, and test them across regions.
