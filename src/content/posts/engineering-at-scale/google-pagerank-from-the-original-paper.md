---
title: "PageRank: The Original Paper Behind Ranking the Web"
slug: "google-pagerank-from-the-original-paper"
description: "How Brin and Page turned the web into an eigenvector problem, what the damping factor is for, and which lessons still apply to ranking inside products."
publishedAt: "2026-07-30"
updatedAt: "2026-09-16"
category: "Google"
tags:
  - Engineering at Scale
  - Google
  - Search
  - Graphs
sources:
  - title: "The Anatomy of a Large-Scale Hypertextual Web Search Engine"
    author: "Sergey Brin and Lawrence Page"
    publisher: "WWW 1998 / Stanford"
    url: "http://infolab.stanford.edu/~backrub/google.html"
  - title: "The PageRank Citation Ranking: Bringing Order to the Web"
    author: "Lawrence Page, Sergey Brin, Rajeev Motwani, Terry Winograd"
    publisher: "Stanford Technical Report, 1999"
    url: "http://ilpubs.stanford.edu:8090/422/"
---

Before PageRank, search engines leaned heavily on keyword frequency and paid placement. Brin and Page's late-1990s work treated a link as a citation: a page is important if important pages point at it. That recursive definition is an eigenvector of a matrix derived from the web's graph — and a remarkably practical one, because they combined it with a crawl, an index, and a paper that also described the engineering of an early Google.

The ranking formula people remember is the damped random surfer. With probability `d` the surfer follows a random out-link; with probability `1-d` they jump to a random page. The jump (typically `d ≈ 0.85`) is not decoration. Without it, rank leaks into dangling pages (no out-links) and the iteration may not converge to a unique distribution.

```text
PR(p) = (1-d)/N + d * sum( PR(q) / outbound(q) )  for q linking to p
```

## Why the paper still belongs in a ranking discussion

Modern search is hundreds of features, learned models, and spam classifiers. The original paper is still the cleanest explanation of **using the graph as a prior**. Recommendation systems that treat follows or citations as endorsements are running a cousin of the same idea (personalized PageRank, SALSA, etc.). If your "importance" score is only clicks, you can be bought. If it is only graph structure, you can be spammed with link farms. Google's later history is the arms race between those two.

Computationally, they already cared about sparse iteration over a graph that did not fit a naive dense matrix. That constraint — the web is large and sparse — is why power iteration and partitioning show up in every later graph-ranking system, including ones that never mention search.

## What broke when they scaled

The 1998 anatomy paper and the 1999 PageRank technical report already knew the web was sparse and hostile. What broke later was not the eigenvector idea — it was adversarial SEO, link farms, and the fact that a static graph prior cannot encode recency or query intent. Power iteration on a crawl that large is a systems problem: partitioning the graph, handling dangling nodes, and recomputing often enough that a new site is not invisible for months. Personalized PageRank and spam classifiers exist because raw PageRank on the open web is gameable.

Query-time ranking also cannot run full PageRank per request. The score is a precomputed (or periodically refreshed) feature among hundreds. Teams that "just implement PageRank" on a social graph discover teleport/damping bugs, dead-end components, and the need for a recompute schedule. Brin and Page's factory — crawl, index, serve — was always the other half of the paper.

## A smaller-team version of the same idea

If you rank items with a citation or follow graph, a damped random walk is a decent prior. Fix dangling nodes, pick `d`, recompute on a schedule, and combine with recency. Do not ship raw PageRank as the only score. For a catalog of thousands of docs, even a spreadsheet of in-degree plus editorial boosts may be enough until someone is farming links.

## What not to cargo-cult

Do not ship raw PageRank on a social graph and call it "the Google algorithm." Personalization, recency, and spam are not optional at product scale. Do take the discipline: write down the random walk, the teleport, the dangling-node policy, and how often you recompute. Ranking bugs are often those policy choices, not the linear algebra.

The anatomy paper is also a systems paper: crawling politely, storing the index, serving queries. Ranking without a crawl and an index is a whiteboard. Reading both Stanford reports together is the right dose of history — the formula, and the factory that made it a product.

## A worked walk on a tiny graph

Three pages: A links to B and C; B links to C; C links to A. With `d = 0.85` and uniform teleport, power iteration from a uniform start converges in a handful of steps. C collects more rank than B because two nodes point at it. If you then make C a dangling node (delete its out-link), that rank must be redistributed — typically via the teleport — or it leaks and the vector no longer sums to one. Implement the dangling policy explicitly in a unit test with a 3×3 matrix; that test will catch the production bug where a new content type has no outgoing links and silently drains the walk.

Personalized PageRank is the same iteration with teleport concentrated on a seed set (the user’s history, a topic page). That is the version recommendation systems actually ship, not the global “importance of the whole web” vector.

## Failure modes

**Link farms.** Dense cliques of low-quality pages that point at a money page inflate graph score. Damping does not remove this; you need spam classifiers, trust seeds, or edge weights that are not binary.

**Dead ends and spider traps.** A strongly connected bucket that the surfer cannot leave without teleport becomes a rank sink. The `1-d` jump is the theoretical fix; in practice you also cap out-degree tricks and drop known trap hosts at crawl time.

**Stale graph.** A weekly recompute on a social product whose follow graph changes hourly will rank yesterday’s celebrity. Write down the lag SLO.

**Using PageRank as a query score alone.** The original system combined it with retrieval. Graph prior without text match is a popularity contest.

## Operational gotchas

Power iteration needs a consistent crawl snapshot; mixing edge files from two days creates “impossible” scores. Store the graph as sparse adjacency, not a dense `N×N`. Monitor dangling-node fraction after each crawl; a sudden spike is a parser bug, not a ranking insight.

## Review checklist

- Damping factor, dangling-node policy, and recompute cadence are written down.
- Teleport is uniform or personalized on purpose, not an accidental leftover.
- Spam / link-farm response exists; graph score is a prior, not the whole ranker.
- Iteration is on a frozen snapshot with a convergence check, not a live mutating table.
