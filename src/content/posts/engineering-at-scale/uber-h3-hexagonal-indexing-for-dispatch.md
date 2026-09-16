---
title: "H3: How Uber Solved Geospatial Indexing With Hexagons"
slug: "uber-h3-hexagonal-indexing-for-dispatch"
description: "Why Uber built a hexagonal hierarchical grid system to power surge pricing, ETAs, and driver-rider matching, and open sourced it as H3."
publishedAt: "2025-07-08"
updatedAt: "2026-09-16"
category: "Uber"
tags:
  - Engineering at Scale
  - Uber
  - Geospatial
  - Algorithms
sources:
  - title: "H3: Uber's Hexagonal Hierarchical Spatial Index"
    publisher: "Uber Engineering Blog"
    url: "https://www.uber.com/blog/engineering/"
---

At the center of Uber's business is a marketplace problem: match riders who want a car to drivers who are nearby, price that match fairly given current supply and demand, and do it continuously across every city Uber operates in. All of that depends on answering spatial questions fast — which drivers are near this pickup point, how is demand distributed across a neighborhood, where should surge pricing boundaries fall — at a volume that makes brute-force distance calculations impractical. Uber's engineering team needed a way to divide the map into indexable regions that could be queried, aggregated, and compared cheaply.

## Why squares and geohashes fell short

Early approaches at Uber, like many geospatial systems, used square or rectangular grid cells — geohashes or quadtree-style indices (similar in spirit to Google's S2 library). These work, but square cells have an awkward geometric property: not all neighbors are equidistant. A cell sharing an edge with its neighbor is closer than one sharing only a corner, which distorts distance-based calculations and makes anything derived from adjacency — like drawing a smooth surge pricing boundary — look blocky and unnatural rather than reflecting the real underlying demand pattern.

## Hexagons and the H3 grid

Uber's answer was H3, a hierarchical hexagonal grid system. Hexagonal cells have a property squares don't: every cell has six neighbors, and all six are (with very close to) equal distance from the center. That uniformity makes distance-based aggregation, smoothing, and visualization much more natural — a heatmap of driver density or a surge multiplier drawn on hexagons follows the real geographic gradient instead of an artifact of the grid shape.

H3 is hierarchical: it defines roughly fifteen resolutions, from huge cells covering large regions down to small ones a few meters across, and cells at one resolution nest cleanly into the cells of a coarser resolution. That lets Uber's systems trade precision for aggregation speed depending on the task — fine resolution for matching a specific rider to nearby drivers, coarse resolution for city-wide demand forecasting — using the same underlying index rather than maintaining separate systems.

One geometric wrinkle is unavoidable on a sphere: you cannot tile a sphere entirely with hexagons. H3 handles this by allowing exactly twelve pentagon cells at fixed locations in the grid, positioned deliberately away from populated areas where possible, so the vast majority of real-world queries never touch them.

Uber uses H3 across dynamic pricing, ETA estimation, driver positioning and heatmaps, and as a general spatial feature-engineering tool for machine learning models that need to bucket location data. In 2018, Uber open sourced H3, and it has since been adopted well beyond ride-hailing, in geospatial analytics, logistics, and mapping tools at other companies.

## A concrete failure mode for hex indexing

H3 tiles the earth so dispatch can ring-expand from a rider instead of fighting polar math with geohash edge cases. The failure mode is mixing resolutions in one index, or using a resolution so fine that a city is millions of cells and so coarse that a river-separated neighborhood looks adjacent. Mid-size steal: one resolution per product question, plus a documented parent/child mapping.

Operational gotcha: hexagon neighbors are not a circle; naive k-ring still has shape quirks at city scale. Test on rivers, airports, and grid cities. Another is storing H3 indexes as strings vs ints inconsistently across services, breaking joins. Pin a library version; an algorithm change across versions is a silent dispatch bug. Privacy: precise hexes at high resolution are location. Retention and access follow GPS policy. Dispatch that iterates rings until it finds N drivers can scan the whole city during a drought of supply; cap the ring and fall back. Do not use H3 as a political boundary; hexes will cut a street. Overlay real polygons for no-pick-up zones. If your marketplace is one metro, a simple grid may suffice. Steal H3 when you have many cities and a need to share libraries. Visualize cells on a map in staging; you will catch off-by-one resolution faster than in a SQL review.

## What you can borrow

- Choose data structures that match your domain's actual geometry, not just what's most familiar — a grid's shape has real downstream effects on the quality of derived calculations like distance and smoothing.
- Hierarchical indexing lets one system serve both fine-grained and coarse-grained queries by choosing resolution, instead of building and maintaining separate systems for each granularity.
- Accept known, documented edge cases (like H3's twelve pentagons) rather than chasing a perfect solution that doesn't exist for the underlying geometry.
- Open sourcing an internal tool that solves a genuinely general problem can build goodwill and attract external contributions and hardening you wouldn't get keeping it private.
