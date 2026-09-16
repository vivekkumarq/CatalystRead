---
title: "Search Infrastructure at Airbnb Scale: Elasticsearch and Geo Queries"
slug: "airbnb-search-infrastructure-elasticsearch-geo-scale"
description: "Ranking gets the attention, but Airbnb's search infrastructure has to first find every listing that could plausibly match a map, dates, and filters, fast."
publishedAt: "2026-04-30"
updatedAt: "2026-09-16"
category: "Airbnb"
tags:
  - Engineering at Scale
  - Airbnb
  - Search
  - Elasticsearch
sources:
  - title: "Airbnb Engineering & Data Science"
    publisher: "Airbnb"
    url: "https://medium.com/airbnb-engineering"
  - title: "Elasticsearch: The Definitive Guide"
    publisher: "Elastic"
    url: "https://www.elastic.co"
---

Before Airbnb's ranking model can decide which listings a guest should see first, something has to answer a more basic question fast: which listings even qualify, given a map area, specific dates, guest count, and a growing list of filters like amenities or instant book? At Airbnb's scale, that retrieval step runs against millions of listings, needs to reflect availability changes within minutes, and has to respond in the time it takes a map to pan — well under the time budget most people associate with "search." That's the problem Airbnb's search infrastructure, built substantially on Elasticsearch, exists to solve.

## Retrieval before ranking

Search at Airbnb's scale is really two problems stacked on top of each other: first, cheaply narrow millions of listings down to the thousands that could plausibly satisfy a query — inside a map viewport, available for the requested dates, matching hard filters like guest capacity — and only then apply the more expensive ranking model to order that narrowed set. Trying to run a full ranking pass over every listing in a market for every search would be far too slow and too costly to serve at the volume Airbnb handles. Elasticsearch, built on Apache Lucene's inverted-index approach, is well suited to this narrowing step because it's designed to answer exactly this kind of multi-criteria filtered query — geo bounds, date-range availability, and keyword or amenity filters together — very quickly across large document sets.

## Geo queries as a first-class problem

A large share of Airbnb search traffic is inherently spatial: a guest drags or zooms a map and expects results to update to whatever's currently in view, or searches a neighborhood name and expects listings genuinely within its boundaries, not just a straight-line radius around a point that happens to spill into the wrong district. Elasticsearch's geo-spatial query support — bounding boxes, distance queries, and geo-shape polygons for irregular boundaries like neighborhoods or cities — lets Airbnb answer "what's in this exact area" efficiently, rather than post-filtering a larger result set in application code after retrieval, which wouldn't scale at the same query volume.

## Keeping the index fresh under constant change

Listing availability isn't static — a listing can be booked, blocked by a host's calendar, or have its price change at any moment, and search results have to reflect that close to real time or guests will find and try to book listings that are no longer actually available. This pushes real engineering weight onto the indexing pipeline: changes to listing availability, pricing, and content need to propagate from Airbnb's primary data stores into the search index quickly and reliably, without falling behind under peak traffic or during a large batch of calendar updates. Balancing index freshness against the cost of constant re-indexing at this scale is an ongoing tuning problem, not a settled one.

## What broke when they scaled

Elasticsearch is excellent at boolean filters and geo bounding boxes; it is a poor primary calendar. Availability at Airbnb is a sparse, high-churn structure: nights booked, nights blocked, min/max stay, cutoff times. If you encode every night as a field on a listing document, documents explode and reindexing a popular market after a weekend of bookings saturates the cluster. If you under-encode availability, the retrieve stage returns listings that fail at booking — the classic "ghost inventory" problem that trains users to distrust search.

Cluster topology also bites. A single index for the world looks simple until heap pressure, garbage collection, and shard imbalance from a few dense cities dominate. Geo queries that scan large polygons (a dragged map over a dense downtown) can pull huge candidate sets before ranking. Airbnb's search stack therefore treats retrieve as a budgeted stage: constrain the viewport, apply hard filters first, and only then spend CPU on ranking features. Replica and refresh settings become product knobs: a one-second refresh is freshness; it is also indexing load.

Partial updates are another mechanic. Price and calendar change far more often than listing title. Update-in-place versus document rewrite, and whether pricing lives in a sidecar store consulted after retrieve, determine whether the search cluster is a search engine or an accidental system of record.

## A smaller-team version of the same idea

Keep an inverted index for fields that are queried combinatorially (location, capacity, amenities). Keep availability in a store designed for date ranges, and filter candidates after a cheap geo retrieve if the corpus is small. When the corpus is large, precompute a compact availability encoding (bitsets per listing for a rolling window) and accept that far-future calendars are approximate until the user commits dates. Measure ghost-inventory rate as a first-class SLI, not just p99 query latency.

## What you can borrow

- Separate cheap retrieval from expensive ranking as two distinct stages — narrowing the candidate set fast with an index-backed query, before running your more expensive model, is usually the only way to keep both scalable and fast.
- If your product has a spatial dimension, use a search engine's native geo query support rather than filtering a coordinate list in application code — the performance difference at scale is substantial.
- Index freshness is a product-quality issue, not just an infrastructure metric — a stale index quietly erodes user trust the moment someone tries to act on a result that's no longer true.
- Budget engineering time for the indexing pipeline as seriously as for the query path; a search system is only as good as how quickly the underlying data changes make it into the index.
