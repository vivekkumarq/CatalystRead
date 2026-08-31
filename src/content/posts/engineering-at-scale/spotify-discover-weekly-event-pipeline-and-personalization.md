---
title: "The Data Pipeline Behind Spotify's Discover Weekly"
slug: "spotify-discover-weekly-event-pipeline-and-personalization"
description: "How Spotify combines collaborative filtering, text analysis, and audio features in a weekly batch pipeline to power Discover Weekly for every user."
publishedAt: "2025-09-15"
category: "Spotify"
tags:
  - Engineering at Scale
  - Spotify
  - Data Engineering
  - Machine Learning
---

Discover Weekly launched in 2015 as a personalized, thirty-song playlist refreshed for every Spotify user every Monday, and it's frequently credited as a major driver of listener engagement. Behind the simple product surface — one playlist, once a week — is not a single clever algorithm but a large batch pipeline that has to generate genuinely personalized recommendations for hundreds of millions of listeners on a fixed weekly deadline.

## Three signal types, combined

Spotify's engineering team has described their recommendation approach as blending several distinct techniques rather than relying on one. Collaborative filtering, using matrix factorization over listening history, finds patterns like "listeners who play these songs together tend to also play that song" — conceptually similar to techniques used for analyzing playlists the way document-modeling techniques analyze text, treating a playlist as a "document" of songs that co-occur. Natural-language analysis mines text about music from around the web — blog posts, forum discussions, articles — to build a cultural understanding of artists and genres that pure listening data misses; this capability traces back to Spotify's 2014 acquisition of The Echo Nest, which had built exactly this kind of web-crawling music intelligence. And raw audio analysis extracts features directly from the audio itself — tempo, key, energy, danceability — so tracks with little listening history yet can still be reasoned about.

## A weekly batch job at enormous scale

Discover Weekly runs on a fixed cadence rather than continuously, which is itself a deliberate design choice. Each week, pipelines generate a large candidate set of tracks per user from the collaborative filtering models, filter out anything the listener already knows well, score the remainder, and assemble the final thirty-track playlist — repeated for every user, on a schedule, ahead of the Monday refresh. Spotify has written about running this kind of large-scale batch workflow using tools like Luigi, a workflow orchestration system Spotify built internally and later open sourced, to manage dependencies between the many jobs that need to complete correctly and on time.

The underlying infrastructure shifted significantly over Spotify's history. The company ran much of its data infrastructure on self-managed Hadoop clusters for years before a large migration to Google Cloud Platform completed around 2016 — at the time, one of the largest known enterprise moves to GCP, adopting tools like Dataflow and BigQuery for the data processing that personalization features like Discover Weekly depend on.

## Beyond pure batch

As the personalization stack matured, Spotify engineers described moving parts of the system toward more adaptive approaches — using bandit algorithms to inform decisions like playlist track ordering, an approach they've referred to in engineering talks as treating recommendations as a bandit problem (sometimes described under the name BaRT, bandits as recommendation treatments), layering real-time signal on top of the weekly batch foundation rather than replacing it.

## What you can borrow

- A fixed, predictable batch cadence is often good enough for personalization, and much cheaper to operate than a fully real-time system — don't assume you need streaming inference by default.
- Combine multiple, structurally different signal types (behavioral, textual, content-based) rather than betting everything on one algorithm; each covers the others' blind spots.
- Invest early in workflow orchestration tooling if your product depends on a large batch job completing reliably and on a deadline every week.
- Revisit infrastructure choices as scale changes — a migration that looked unnecessary at launch can become the right call once volume outgrows self-managed infrastructure.
