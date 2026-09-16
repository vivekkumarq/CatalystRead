---
title: "Pixie: Real-Time Recommendations from an In-Memory Graph Walk"
slug: "pinterest-pixie-random-walk-graph-recommendations"
description: "Pinterest's Pixie system serves billions of recommendations in real time by running random walks over an enormous pin-and-board graph held in memory."
publishedAt: "2025-06-28"
updatedAt: "2026-09-16"
category: "Pinterest"
tags:
  - Engineering at Scale
  - Pinterest
  - Recommendation Systems
  - Graph Algorithms
---

Pinterest's core data is naturally a graph: pins get saved to boards, boards belong to users, and pins relate to each other through how often they're co-saved together. Recommending "more pins like this one" is, underneath the product framing, a graph traversal problem at a scale of billions of pins and boards. Pinterest's engineering team, together with researchers, published work on Pixie, a system that answers this kind of query using random walks over the pin-board graph computed in real time, rather than relying purely on precomputed similarity tables that go stale between batch runs.

## Why a random walk instead of precomputed similarity

A common alternative approach precomputes item-to-item similarity offline — for every pin, calculate and store its nearest neighbors ahead of time, then simply look up that table at serving time. This is fast to serve but has a real weakness: it can't easily incorporate personalization signal or freshly created content into the results without a full recomputation, and it treats similarity as a static, global property of a pin rather than something that can depend on who's asking and what they've engaged with recently. Pixie instead computes recommendations live, per request, by running a random walk starting from a user's recently interacted pins across the graph, letting the walk itself surface relevant related pins based on the graph's actual structure at query time.

## How the walk works, at a high level

A random walk starting at a given pin repeatedly hops to a connected board, then to another pin on that board, and so on, biased so that pins visited more frequently across many walk steps accumulate a higher score — the intuition being that pins closely and robustly connected to the starting point through many paths in the graph are more relevant than pins reached only by one thin, coincidental connection. Running many such walks in parallel from multiple seed pins, and aggregating visit counts across all of them, produces a ranked list of candidate recommendations that reflects the graph's real connectivity patterns rather than a single precomputed heuristic.

```text
seed pins -> walk: pin -> board -> pin -> board -> ...
             (biased random hops, many walks in parallel)
          -> aggregate visit counts across all walks
          -> rank pins by visit frequency
```

## Making a graph-scale algorithm run in real time

The genuinely hard engineering problem wasn't the random walk algorithm itself — random walks over graphs are a well-known technique — it was making that computation run fast enough, over a graph with billions of nodes and edges, to serve live user requests within a tight latency budget. Pinterest's approach involved keeping a large, efficiently-encoded representation of the graph in memory across a cluster of machines, since disk-backed graph traversal at this scale would be far too slow for real-time serving, and engineering the walk implementation itself to be efficient enough to run many thousands of walk steps per request without blowing latency budgets.

## Personalization falls out of the same mechanism

Because the walk starts from a specific user's own recent activity rather than a single global starting point, personalization isn't a separate system bolted on afterward — it's a natural consequence of which pins seed the walk in the first place. Two users with different pinning histories seed different walks over the same underlying graph and naturally surface different recommendations, without needing a separate personalization layer on top of a generic similarity system.

## A concrete failure mode for random-walk recs

Pixie-style random walks on a pin-board-user graph can surface related pins without a giant deep model. The failure mode is a walk that hugs supernodes: popular boards and celebrity accounts absorb the walk, and recommendations collapse to the same viral cluster. Mid-size steal: degree capping, teleport probability back to the seed, and a blocklist for spam boards, before you tune embeddings.

Operational gotcha: a graph snapshot that is rebuilt daily while spam rings form hourly. Walks then amplify the ring until a human notices. Another is online walks that are too expensive for the request path; teams cache related-pin sets that go stale after a board delete, showing gone pins. Steal a tombstone check at serve time. Privacy: walks can leak a private board if an edge should not have been in the snapshot. Authorization belongs in graph construction. Randomness without a seed policy makes tests and debugging miserable; log the seed and version of the graph. Evaluation must include "not just more of the same." If your related pins never leave the seed's dominant category, the walk is not exploring. Mid-size teams can implement a two-hop co-occurrence table as a stepping stone; it has similar hotspot issues and is easier to reason about than a distributed walker.

## What you can borrow

- When your data is naturally graph-shaped, consider whether traversal-based algorithms can replace or complement precomputed similarity tables, especially where personalization or freshness matters.
- Real-time computation over a large in-memory graph can outperform stale precomputed tables, but only if the traversal itself is engineered for tight latency budgets.
- Let personalization emerge from the input to a general algorithm (which nodes you start from) rather than building a separate bespoke personalization layer.
- Aggregating many cheap, randomized samples (like parallel random walks) can approximate a much more expensive exact computation well enough for production use.
