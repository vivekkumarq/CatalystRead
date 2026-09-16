---
title: "Wardley Mapping for Platform Bets: Evolution, Not a SWOT with Arrows"
slug: "wardley-mapping-for-platform-bets"
description: "Simon Wardley's value chain plus evolution axis: genesis to commodity, and why you should not custom-build a commodity CI."
publishedAt: "2026-09-04"
category: "Software Engineering"
tags:
  - Software Engineering
  - Strategy
  - Wardley Maps
  - Platform
sources:
  - title: "Wardley Maps"
    author: "Simon Wardley"
    publisher: "medium.com/wardleymaps"
    url: "https://medium.com/wardleymaps"
  - title: "Wardley Mapping"
    publisher: "Learn Wardley Mapping"
    url: "https://learnwardleymapping.com/"
---

A strategy deck that lists "AI" and "Kubernetes" as strengths is not a map. **Wardley Maps** place **user need** at the top, a **value chain** of components below (what depends on what), and an **evolution** axis from left to right: genesis → custom → product → commodity. Components move right over time. The point of a **platform bet** is to notice you are building a **custom** thing that the market already treats as **product or commodity**, or the reverse: treating a genesis advantage as if you could buy it.

## How to draw one in an afternoon

Anchor: who is the user (internal developer, end customer). Need: "ship a service with observability." Components: CI, clusters, golden images, secrets, the actual product code. Position CI: if GitHub Actions is fine, it is **product/commodity**. If you run a unique regulated pipeline, it may sit left — **and that is a cost**. Invisible components (power, AWS) sit near commodity.

```text
Need: Deploy service
  App  (custom)
  Golden path (custom → product if you productize it)
  Kubernetes (product)
  Compute (commodity)
```

Climatic patterns: everything evolves; inertia (old contracts, skills) slows you. Doctrine: use common components where they are commodity.

## Platform bets

Build a paved road when many stream teams duplicate **custom** work. Do not build a private cloud that clones EC2 unless you have a reason that survives the map (air gap, cost at insane scale). Buy observability if it is product; build the **glue** to your domain if that glue is still custom.

Maps are wrong; they are **less wrong** than a SWOT. Redraw quarterly. Fight about position (is our feature store genesis or product?) — that fight is the strategy conversation.

## Pitfalls

Putting everything in the middle. Mapping org charts instead of components. Using the map as a wall poster nobody updates.

Read Wardley's introductory chapters (the book-on-medium). Then map "how a feature gets to production" with three engineers. If CI sits at genesis while the industry sits at commodity, you found a bet: migrate, or justify the custom with a constraint that is still true. The axis is the insight. The boxes without an axis are a whiteboard doodle.
