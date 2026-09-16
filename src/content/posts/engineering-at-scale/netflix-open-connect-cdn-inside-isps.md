---
title: "Open Connect: How Netflix Built a CDN That Lives Inside Your ISP"
slug: "netflix-open-connect-cdn-inside-isps"
description: "Why Netflix stopped renting third-party CDN capacity and started shipping its own caching appliances directly into internet service providers."
publishedAt: "2025-06-03"
updatedAt: "2026-09-16"
category: "Netflix"
tags:
  - Engineering at Scale
  - Netflix
  - CDN
  - Networking
sources:
  - title: "Netflix Technology Blog"
    publisher: "Netflix"
    url: "https://netflixtechblog.com"
  - title: "Netflix Open Connect"
    publisher: "Netflix"
    url: "https://openconnect.netflix.com"
---

Streaming video is mostly a bandwidth problem wearing a UX costume. By the early 2010s Netflix was already a meaningful share of North American internet traffic during peak hours, and leaning entirely on third-party CDNs meant every bad peering link, every congested transit point, and every provider's own outages became Netflix's problem too. The response was Open Connect: a purpose-built content delivery network, with hardware Netflix designs itself, that Netflix gives away to internet service providers for free.

## Appliances, not just software

An Open Connect Appliance (OCA) is a server Netflix builds, loaded with a stripped-down FreeBSD stack, nginx, and enough SSD or spinning disk to hold a meaningful slice of the catalog. ISPs host these boxes in their own facilities or at internet exchange points, at no cost to the ISP, in exchange for handling Netflix traffic locally instead of hauling it across the ISP's expensive upstream transit links. It's a trade that benefits both sides: the ISP's network looks less congested and its customers get better streaming quality, while Netflix gets a delivery path it controls end to end instead of depending entirely on someone else's CDN economics.

This is a deliberate contrast with how most large content companies operate. Rather than negotiating capacity with a handful of commercial CDN vendors, Netflix designs its own edge hardware, controls the software stack on it, and pushes deployment decisions — how much storage, how much network capacity, where geographically — based on its own traffic data rather than a vendor's business model.

## Filling caches before anyone hits play

The clever part isn't the box, it's the scheduling. Netflix can't cache the entire catalog on every appliance everywhere, so it predicts what each region will want to watch and pre-positions ("fills") that content onto nearby OCAs overnight, during hours when the ISP's network is otherwise idle. By the time viewers start pressing play the next evening, the popular titles for that region are already sitting on a box a few network hops away, and the fill traffic itself never competes with peak-hour streaming because it's scheduled around it.

That prediction problem is its own engineering discipline: popularity varies by region, by day of week, by new-release timing, and getting it wrong means either wasted appliance storage or cache misses that fall back to a more distant, slower source. Netflix continuously tunes these placement algorithms rather than treating cache-fill as a one-time capacity planning exercise.

## Peering as an engineering surface, not just a business relationship

Open Connect also pushed Netflix deep into internet peering — the practice of connecting directly with ISPs and exchange points instead of routing everything through paid transit providers. Netflix engineers work with network operators on where to place appliances, how much local capacity to provision, and how traffic should route during partial outages. That turned what's traditionally a contracts-and-business-development problem into something Netflix engineering teams instrument, measure, and iterate on like any other system, with public dashboards showing ISP-level streaming quality that put real performance data in front of both Netflix and the provider.

The payoff shows up as fewer rebuffers, faster start times, and a delivery architecture that degrades more gracefully than one dependent on a small number of third-party CDN relationships. It also gave Netflix leverage and resilience that pure commercial CDN contracts couldn't: appliances embedded in thousands of networks worldwide meant no single vendor outage could take Open Connect down entirely.

## What a mid-size team can steal without building a CDN

Open Connect exists because video bits are enormous and last-mile transit is expensive. You will not embed appliances in ISPs. You can steal the traffic-engineering mindset: push popular, cacheable bytes as close to the viewer as economics allow, and treat origin as a scarce resource. For a mid-size streaming or download product that means a commercial CDN, long cache TTLs on immutable encodes, and origin shields so a miss storm cannot melt encoders.

The concrete failure mode is versioned assets with cache-busting query strings on every deploy, so the CDN is a very expensive reverse proxy. Another is packing personalized manifests that cannot be cached while the segments could be; put identity in the playlist logic, not in every byte. Operational gotcha: fill traffic when a new episode drops worldwide. Pre-positioning popular titles, or at least pre-warming regional caches, is the Open Connect idea at human scale. TLS and tokenized URLs that expire too aggressively cause playback errors that look like app bugs. Log cache-hit ratio and origin bandwidth as product metrics, not only CDN vendor graphs. If your origin is in one region, a distant ISP outage is your outage. Multi-CDN failover is worth more than a custom POP until you have Open Connect's volume and peering team.

## What you can borrow

- If a dependency sits on your critical path and its economics don't match your traffic pattern, consider owning that layer instead of renting it.
- Move heavy, predictable transfers to off-peak windows instead of competing with live traffic for the same capacity.
- Treat placement and prediction as measurable engineering problems, not one-time capacity decisions — revisit them as usage shifts.
- Publish or at least track quality metrics per delivery path; visibility into where content is slow is what makes optimization possible.
- Diversify delivery paths so no single external vendor's outage becomes your outage.
