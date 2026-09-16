---
title: "PageRank: The Original Paper Behind Ranking the Web"
slug: "google-pagerank-from-the-original-paper"
description: "How Brin and Page turned the web into an eigenvector problem, what the damping factor is for, and which lessons still apply to ranking inside products."
publishedAt: "2026-07-30"
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

## What not to cargo-cult

Do not ship raw PageRank on a social graph and call it "the Google algorithm." Personalization, recency, and spam are not optional at product scale. Do take the discipline: write down the random walk, the teleport, the dangling-node policy, and how often you recompute. Ranking bugs are often those policy choices, not the linear algebra.

The anatomy paper is also a systems paper: crawling politely, storing the index, serving queries. Ranking without a crawl and an index is a whiteboard. Reading both Stanford reports together is the right dose of history — the formula, and the factory that made it a product.
