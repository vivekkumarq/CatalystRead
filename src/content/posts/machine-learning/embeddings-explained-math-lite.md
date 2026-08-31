---
title: "Embeddings, Explained With Minimal Math"
slug: "embeddings-explained-math-lite"
description: "What embeddings actually are, why distance in that space means something, and how to reason about them without wading through linear algebra."
publishedAt: "2026-04-29"
category: "Machine Learning"
tags:
  - Machine Learning
  - Deep Learning
  - NLP
  - Embeddings
---

An embedding is a list of numbers that represents something — a word, an image, a product, a user — in a way that makes similar things end up with similar lists of numbers. That's the entire idea. Everything else — dot products, cosine similarity, the specific dimensionality you choose — is implementation detail in service of that one property.

## Why not just use a one-hot vector?

The naive way to represent a category is one-hot encoding: a vector of all zeros except a single 1 marking which category it is. This works but throws away all relationships between categories — "cat" and "dog" end up exactly as different from each other as "cat" and "spreadsheet," because every pair of one-hot vectors is equally far apart by construction. There's no way to express "these two are similar" in that representation.

Embeddings fix this by learning a lower-dimensional, dense vector for each item such that the geometry of the space reflects real similarity. Two words that appear in similar contexts end up close together; two products frequently bought by the same customers end up close together. The dimensions themselves usually aren't individually interpretable — you can't point at dimension 47 and say "that's formality" — but the overall geometry carries meaning.

## How the numbers get learned, without the calculus

You don't hand-design embeddings; you learn them by training a model on a task where getting the embedding "right" helps the model perform better, then keeping the learned vectors and discarding the rest of the model. Word2Vec's skip-gram objective is a clean example: given a word, predict the words that appear near it in real text. A model that's good at this prediction task has necessarily learned to place words with similar neighbors close together in vector space, because that's what makes the prediction easy.

```python
from sklearn.metrics.pairwise import cosine_similarity
import numpy as np

# embeddings for "king", "queen", "man", "woman" — illustrative values
king = np.array([0.21, 0.88, -0.15, 0.42])
queen = np.array([0.24, 0.91, -0.10, 0.05])

similarity = cosine_similarity([king], [queen])[0][0]
```

Cosine similarity measures the angle between two vectors, ignoring magnitude — it answers "do these point in the same direction," which tends to be a more robust notion of similarity than raw Euclidean distance, especially in the high-dimensional spaces embeddings typically live in.

## The famous analogy trick isn't magic, it's geometry

The classic demonstration — `king - man + woman ≈ queen` — works because the training objective pushes the model to encode relationships as consistent directions in the space. If "man to king" and "woman to queen" both represent the same relationship (person to monarch), and the model has learned that relationship consistently, then the vector difference for one pair approximates the vector difference for the other. This doesn't always work as cleanly as the famous example suggests, but the underlying mechanism — relationships as directions, not just points as locations — is real and shows up throughout embedding-based systems.

## What dimensionality actually trades off

| Dimensionality | Trade-off |
|---|---|
| Low (e.g. 50-100) | Fast, cheap, may underfit complex relationships |
| Medium (e.g. 300-768) | Common default for text; balances capacity and cost |
| High (e.g. 1500+) | Captures finer distinctions; more storage and compute per comparison |

More dimensions aren't free — every dimension adds storage and compute cost to every similarity search you run, and past a certain point additional dimensions mostly encode noise or redundant information rather than new signal.

## Where this shows up beyond NLP

The same idea powers recommendation systems (user and item embeddings, where proximity means "likely to be a good match"), image search (visually similar images end up close together), and semantic search over documents (retrieving by meaning rather than keyword overlap). In every case, the actual work happens in two stages: train or download a model that produces good embeddings for your domain, then build an efficient nearest-neighbor search — libraries like FAISS or HNSW-based indexes — over the resulting vectors, since brute-force distance computation stops being practical well before you reach a few million items.
