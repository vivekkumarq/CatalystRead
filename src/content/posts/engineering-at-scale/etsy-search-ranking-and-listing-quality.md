---
title: "Ranking a Marketplace: Etsy's Search Between Relevance, Quality, and Fairness to Sellers"
slug: "etsy-search-ranking-and-listing-quality"
description: "How Etsy ranked listings so buyers could find a handmade needle in a haystack without letting spam and keyword stuffing define the marketplace."
publishedAt: "2026-11-23"
updatedAt: "2026-11-23"
category: "Etsy"
tags:
  - Engineering at Scale
  - Etsy
  - Search
  - Machine Learning
sources:
  - title: "Code as Craft"
    publisher: "Etsy"
    url: "https://www.codeascraft.com"
  - title: "Search ranking at Etsy"
    publisher: "Etsy"
    url: "https://www.codeascraft.com/blog"
---

Etsy search is not a web crawler problem. The documents are listings the sellers wrote, photographed, and priced, and the index is the marketplace. If ranking only maximizes click-through, you get cheap jewelry with keyword stuffing in the title. If ranking only maximizes "handmade purity," you get a cathedral nobody can shop. Etsy's search engineering, as told over years of Code as Craft posts, has been a negotiation among lexical retrieval, learned ranking, listing quality signals, and the economics of a two-sided market.

## Retrieval is still a pile of tokens

Early and ongoing, Etsy leaned on inverted indexes — Solr and later Elasticsearch-shaped stacks in various generations — because buyers type "wool cat bed" and expect those words to matter. Query understanding has to deal with misspellings, materials, and the fact that sellers invent adjectives. Filters (price, location, ship-to) are not afterthoughts; they are predicates that must remain correct while the ranker shuffles the rest.

Text alone is a spam magnet. Listing quality models look at photos, completeness, reviews, recency of shop activity, and policy violations. Those signals have to be cheap enough to compute at index time or fast enough at query time. A quality score that is a batch job from last week will miss the shop that just got suspended.

## Learning to rank without wrecking the long tail

Etsy has discussed machine-learned ranking: features about the query, the listing, the shop, and the buyer. Marketplaces have a cold-start problem that Google web search does not. A new listing has no click history. If you require proof of engagement to rank, you bury new makers. If you boost newness too hard, you bury shops that consistently deliver. The ranker is a policy for who gets oxygen.

Personalization and taxonomies (Etsy's categories) add more axes. A buyer who always clicks vintage furniture should not see the same global "popular" as a buyer hunting craft supplies. Personalization that is too aggressive makes the marketplace feel smaller than it is. Offline evaluation (NDCG on judgments) and online experiments both exist because search quality is not one number. A metric that rises while refunds rise is a bad ranker.

## Failure modes of marketplace ranking

The concrete failure is optimizing for purchase rate while sellers game titles with every synonym they can paste. You train on the game. Mid-size steal: independent quality classifiers, policy enforcement in the index, and a human eval set that includes long-tail queries, not only head terms.

Operational gotcha: filters that disagree with ranking ("in stock" listings that are not) destroy trust faster than a slightly worse order of good items. Inventory and shipping promises must be in the same freshness domain as search. Another is a replica index that lags during a sale; buyers find ghosts. Rebuild and incremental update need SLOs. Diversity: twenty near-duplicate listings from one shop in the first page is a ranking bug that looks like a catalog bug. Put shop concentration caps in the blender. If you use embeddings now, still keep a lexical path for exact SKU-like queries and for the day the ANN index is wrong. Log the ranking explanation for a sample of queries; otherwise you cannot answer a seller who asks why they vanished, and trust in the market is part of the product.

## What you can borrow

- Combine lexical retrieval with quality signals that are hard to fake, or your index will be a spam contest.
- Design cold-start so new listings can breathe without letting them drown proven shops.
- Keep filters and inventory on a freshness SLO as tight as the ranker.
- Evaluate with long-tail queries and seller-side outcomes, not only head-term conversion.
