---
title: "Ranking Search Results Across DoorDash's Three-Sided Marketplace"
slug: "doordash-search-discovery-ranking-marketplace"
description: "DoorDash's search ranking has to satisfy consumer relevance, merchant fairness, and operational reality like store hours and prep time all at once."
publishedAt: "2025-12-08"
updatedAt: "2026-09-16"
category: "DoorDash"
tags:
  - Engineering at Scale
  - DoorDash
  - Search
  - Machine Learning
  - Ranking
sources:
  - title: "DoorDash Engineering Blog"
    publisher: "DoorDash"
    url: "https://careers.doordash.com/blog"
---

Search and discovery on DoorDash looks like a familiar problem on the surface — a consumer types a query or browses a homepage, and the system needs to return relevant results — but the "relevant" part is more layered than in a typical e-commerce search box. A result has to be a good match for what the consumer is looking for, but it also has to be a store that's actually open, close enough to deliver in a reasonable time, and capable of preparing the order without excessive wait. Layer on top of that a marketplace with thousands of merchants who all want fair visibility, and a business that has its own incentives around which stores to surface, and ranking becomes a genuinely multi-objective problem rather than a straightforward relevance-scoring exercise.

## Relevance is necessary but not sufficient

Text matching between a query and a store's name, cuisine tags, or menu items is table stakes — get someone searching "sushi" a list of sushi restaurants, not a Wikipedia problem. But a text-relevant result that's currently closed, thirty minutes outside a reasonable delivery radius, or so busy that prep time would push delivery well past a customer's tolerance is a poor result even though it matched the query perfectly. DoorDash's ranking has to blend text and category relevance with real-time operational signals — store hours, current order volume at a merchant, estimated prep and delivery time — so that what gets surfaced is not just topically right but actually deliverable in a timeframe the customer will accept.

## Personalization on top of relevance

Beyond a single query, DoorDash also has to rank an entire homepage of recommended stores and dishes for a consumer who hasn't typed anything at all, which leans more heavily on personalization: a customer's order history, cuisines they favor, price sensitivity, and time-of-day patterns all factor into what gets surfaced first. This is a classic candidate generation plus ranking structure — a broad, cheap pass narrows the full merchant catalog down to a plausible candidate set for a given consumer and context, and a more expensive learned ranking model orders that smaller candidate set using richer features.

```text
Full merchant catalog
        |
  candidate generation (cheap, broad filter:
  location radius, category match, open now)
        |
  learned ranking model (relevance + personalization
  + operational signals: prep time, ETA, past orders)
        |
  final ranked results shown to consumer
```

## The three-sided fairness problem

Because DoorDash's marketplace has consumers, merchants, and Dashers all depending on its health, ranking can't be purely about maximizing short-term consumer engagement. A brand-new merchant with no order history will lose a naive popularity-driven ranking every time, which creates a cold-start problem: give new merchants no visibility and they never accumulate the order history needed to rank well organically, which is bad for the marketplace's long-term merchant supply even if it looks fine in a short-term consumer-engagement metric. Ranking systems at this kind of marketplace generally build in deliberate mechanisms — exploration slots, new-merchant boosts — to give newer or lower-volume merchants a fair chance to be discovered rather than letting rank purely compound existing popularity.

## Closing the loop with real engagement data

Ranking models are only as good as the labels they're trained against, and DoorDash uses actual consumer behavior — clicks, orders, repeat visits to a merchant — as the feedback signal that continuously retrains and improves the ranking models, rather than relying on a static, hand-tuned scoring formula that goes stale as consumer preferences and the merchant catalog evolve.

## What broke when they scaled

Consumer relevance alone ranks closed stores, 90-minute ETAs, and merchants who cannot absorb more orders at 6:30 p.m. DoorDash's search/discovery writing treats ranking as a three-sided problem: the diner's query, the merchant's fairness and capacity, and logistics (Dasher availability, prep time, distance). A model trained only on clicks will promote the restaurant that photographs well and starve the one that actually delivers on time.

Hard filters (open now, delivers to this pin, cuisine) must happen before ranking or you waste model CPU on illegal candidates — same retrieve/rank split as Airbnb search, with a time-varying inventory of "open." Personalization without exploration creates filter bubbles that hurt new merchants. DoorDash has written about mixing exploration and business constraints into ranking rather than bolting them on as afterthoughts.

Marketplace fairness is operational: if ranking always sends demand to the same five chains, local restaurants churn off the platform. That is a product policy encoded as features and constraints, not a niceness slide.

## A smaller-team version of the same idea

Filter to feasible (open, in range, capacity). Sort by a simple score: distance, rating, ETA. Cap how often the same chain occupies the top slots. Log what you showed. When you have conversion data, train a model on the same features. Do not optimize clicks if the business cares about completed deliveries.

## What you can borrow

- Treat operational feasibility (can this actually be fulfilled well) as a ranking input, not an afterthought filter applied after relevance scoring.
- Use a cheap candidate-generation pass to narrow the field before running an expensive ranking model on the full catalog.
- Build deliberate mechanisms to give new or low-volume entities visibility; a purely popularity-driven ranking compounds existing advantage and starves cold-start supply.
- Retrain ranking models continuously against real engagement data rather than relying on static, hand-tuned scoring rules.
