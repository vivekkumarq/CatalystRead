---
title: "Teaching Pinterest to See What's Inside a Pin"
slug: "pinterest-visual-search-object-detection-pins"
description: "How Pinterest built visual search and object detection to let people discover products and ideas by tapping on specific items inside an image."
publishedAt: "2025-08-14"
category: "Pinterest"
tags:
  - Engineering at Scale
  - Pinterest
  - Computer Vision
  - Search
---

A pin is fundamentally an image, and the most valuable information in that image is often not captured by its title, description, or the board it was saved to. A photo of a living room might be pinned for the whole aesthetic, but a shopper looking at it may only care about the lamp in the corner or the rug on the floor. Pinterest built visual search to close that gap — letting people point at a specific object inside a pin, rather than the pin as a whole, and find visually similar items or the same product elsewhere on the platform.

## From whole-image search to object-level search

Early visual search on the web generally worked at the level of whole images: given an image, find other images that look similar overall. That's a reasonable starting point but it doesn't match how people actually browse a lifestyle or product photo — they notice one item within a busy scene, not the entire composition. Pinterest's visual search needed an object detection step first, identifying and drawing bounding boxes around distinct objects within a pin — a chair, a piece of jewelry, a jacket — before any similarity search could operate on the right unit of interest rather than the whole cluttered image.

```text
Pin image -> object detection (bounding boxes: lamp, rug, sofa, ...)
          -> crop region user tapped
          -> visual embedding of that crop
          -> nearest-neighbor search over embeddings of other pins
```

This detection step had to run efficiently across Pinterest's enormous and constantly growing image corpus, since object regions needed to be identified and indexed ahead of a user ever tapping on them, turning what sounds like a single-request computer vision problem into a large-scale, continuously running indexing pipeline as well.

## Embeddings and nearest-neighbor search at massive scale

Once a region of interest is identified, the next step converts it into a numerical embedding — a vector representation, produced by a trained neural network, positioned so that visually and semantically similar objects land near each other in the embedding space. Finding good results then becomes an approximate nearest-neighbor search problem over an enormous index of embeddings, one for essentially every distinct object detected across billions of pins, which pushed Pinterest toward specialized approximate nearest-neighbor infrastructure rather than a brute-force comparison against every embedding for every query, since brute force simply doesn't scale to that volume within an interactive latency budget.

## Connecting visual search to shopping

Visual search became especially valuable once tied to Pinterest's shopping features, letting a visual match surface not just other inspirational pins but actual purchasable products that look similar to the detected object. That connection meant the visual embeddings needed to bridge two different domains reasonably well — the aesthetic, often professionally styled world of lifestyle and inspiration photography, and the more literal, catalog-style world of product photography from merchants — which is a harder matching problem than comparing images within a single consistent style, since the same physical object can look quite different photographed in a curated lifestyle shot versus a plain product listing photo.

## What you can borrow

- If users care about parts of your content rather than the whole item, invest in detecting and indexing those parts specifically, rather than only searching at the whole-item level.
- Precompute and index embeddings ahead of query time for anything searched at scale; real-time embedding generation for every query rarely meets latency budgets.
- Approximate nearest-neighbor search is usually the right trade-off once your index grows past what brute-force comparison can handle interactively.
- When bridging two different content domains (inspirational vs. catalog imagery, in this case), expect the matching problem to be harder than same-domain search, and evaluate accordingly.
