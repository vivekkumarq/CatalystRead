---
title: "Why Spotify Left Its Own Data Centers for Google Cloud"
slug: "spotify-datacenter-to-google-cloud-migration"
description: "How Spotify moved a music streaming service serving hundreds of millions of users off self-managed data centers and onto Google Cloud without a big-bang cutover."
publishedAt: "2025-10-17"
category: "Spotify"
tags:
  - Engineering at Scale
  - Spotify
  - Cloud Infrastructure
  - Migration
---

For its first several years, Spotify ran its backend primarily out of self-managed data centers, an approach common among infrastructure-heavy companies of that era that wanted full control over hardware and cost. Around 2015, Spotify announced it would migrate to Google Cloud Platform, a decision it later wrote about candidly in its engineering blog as being driven less by any single technical failure and more by the growing operational tax of running data centers themselves — capacity planning, hardware procurement lead times, and physical infrastructure work that pulled engineering time away from building product.

## Buying elasticity instead of building it

Spotify's own account of the decision emphasized elasticity as the deciding factor. Music streaming has pronounced usage patterns — daily and weekly cycles, regional differences, spikes around new releases — and provisioning physical data center capacity for peak load meant paying for idle hardware most of the time. Cloud infrastructure let Spotify provision for typical load and burst for peaks, shifting a capital expenditure and lead-time problem into an operational one. Beyond compute elasticity, Spotify also cited access to managed data infrastructure — services like BigQuery and Bigtable — as reducing how much undifferentiated infrastructure engineering Spotify's own teams needed to build and operate themselves, letting them focus more of their effort on product and less on keeping databases alive.

## Migrating a live service without a big-bang cutover

Moving a service serving hundreds of millions of active users, with strict expectations of always-on playback, ruled out a single flag-day cutover. Spotify's migration ran service by service and team by team over roughly two years, with individual squads owning the move of their own systems rather than a central team executing one giant lift-and-shift. This distributed-ownership approach mirrored Spotify's broader squad-based engineering culture: teams that best understood a service's dependencies and traffic patterns were also the ones responsible for migrating it safely, rather than a platform team attempting the same task with less context. Running both environments concurrently during the transition, and cutting individual services over as they were verified, kept the blast radius of any single migration step small.

## What you can borrow

- A large infrastructure migration is safer executed incrementally, service by service, by the teams who understand each service's traffic and failure modes, rather than as one coordinated cutover owned centrally.
- When evaluating a move to managed infrastructure, weigh the elasticity and reduced operational burden against the loss of low-level control — the right call depends heavily on how spiky your load is and how much undifferentiated infrastructure work you're currently absorbing.
- Running old and new environments side by side during a migration, and cutting over incrementally once each piece is verified, reduces the risk of any single step compared to a wholesale switch.
- Letting the team that owns a system also own its migration keeps context where it belongs, rather than making a platform team relearn every consumer's edge cases from scratch.
