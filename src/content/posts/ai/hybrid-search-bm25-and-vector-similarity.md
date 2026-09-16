---
title: "Hybrid Search: Combining BM25 and Vector Similarity"
slug: "hybrid-search-bm25-and-vector-similarity"
description: "Why pure vector search underperforms on keyword-heavy queries, and how to combine it with BM25 using score fusion that actually works."
publishedAt: "2026-07-10"
updatedAt: "2026-09-16"
category: "AI"
tags:
  - AI
  - Search
  - RAG
  - Embeddings
---

Pure vector search is worse than keyword search at exactly the queries that matter most in technical and enterprise settings: exact identifiers, error codes, product SKUs, acronyms, and rare proper nouns. Embedding models are trained to capture semantic meaning, and a string like "ERR_429_RATE_LIMIT" doesn't have much semantic meaning to compress — it's an identifier, and identifiers are what keyword search was built for. Hybrid search exists because these two methods fail on complementary query types.

## Why embeddings struggle with exact terms

An embedding model maps "how do I fix a rate limit error" and "ERR_429_RATE_LIMIT troubleshooting" close together in vector space if it's a good model, but it can also map that specific error code close to semantically related but wrong content, because the model is reasoning about meaning, not matching the literal string. BM25, a classic term-frequency ranking algorithm, does the opposite well: it rewards exact and near-exact term matches, weighted by how rare and how discriminative the term is across the corpus. A rare error code appearing in a document is a strong signal under BM25 and a weak, unreliable one under pure embedding similarity.

```python
# BM25 rewards rare, exact matches — no semantic understanding needed
bm25_scores = bm25_index.search("ERR_429_RATE_LIMIT", top_k=20)

# Vector search rewards semantic similarity — good for paraphrase, weak for exact IDs
vector_scores = vector_index.search(embed("ERR_429_RATE_LIMIT"), top_k=20)
```

Neither ranking alone is reliable across a typical query mix that includes both natural-language questions and exact-term lookups.

## Score fusion: don't just average raw scores

BM25 scores and cosine similarity scores live on entirely different scales and distributions, so naively averaging them is meaningless — a BM25 score of 8.2 and a cosine similarity of 0.82 aren't comparable numbers. Reciprocal Rank Fusion (RRF) sidesteps this by combining rank position instead of raw score, which makes it robust to the scale mismatch without needing to calibrate anything.

```python
def reciprocal_rank_fusion(bm25_results, vector_results, k=60):
    scores = {}
    for rank, doc_id in enumerate(bm25_results):
        scores[doc_id] = scores.get(doc_id, 0) + 1 / (k + rank + 1)
    for rank, doc_id in enumerate(vector_results):
        scores[doc_id] = scores.get(doc_id, 0) + 1 / (k + rank + 1)
    return sorted(scores.items(), key=lambda x: x[1], reverse=True)
```

The constant `k` (commonly 60) dampens the influence of any single ranking's top result dominating the fused score — it's a reasonable default, but worth sanity-checking against your own query set rather than assuming it transfers.

## When to weight one signal higher than the other

Straight RRF treats both signals equally, but query intent often tells you which should dominate. A query that's mostly an exact identifier or short technical term benefits from weighting BM25 higher; a long natural-language question benefits from weighting vector similarity higher. Some systems detect this heuristically (query length, presence of identifiers matching known patterns) and adjust fusion weights per query rather than using one fixed formula for everything.

| Query characteristic | Favor |
|---|---|
| Contains exact codes, SKUs, error strings | BM25 |
| Long natural-language question | Vector similarity |
| Acronyms and domain jargon | BM25 |
| Paraphrased or conceptual question | Vector similarity |

## It's not free — index and maintain both

Hybrid search means running and maintaining two indexes, keeping them in sync on every document update, and adding the fusion step to your query latency budget. For corpora that are almost entirely natural-language prose with no meaningful identifiers, the lift from adding BM25 may not be worth the operational overhead. For anything with technical content, product catalogs, or exact-match-sensitive queries, the recall improvement is usually large enough to justify it — measure it directly on your own golden query set rather than assuming either way.

## A worked failure mode

A docs search replaces BM25 with embeddings only. Queries like `error 0x80070005` and SKU `NX-14b` fall to nearest neighbors of unrelated "permission" prose. Recall looks fine on a paraphrase-heavy eval set and terrible on production query logs. The team then adds hybrid but concatenates scores without calibration: a long BM25 document always wins because raw BM25 and cosine live on different scales. Users see the same three pages. Reciprocal rank fusion, or z-scored weighted sums on a held-out log sample, would have surfaced the error-code hit from lexical search while keeping semantic matches for "how do I fix access denied on install."

## When this is the wrong tool

If every query is an identifier, BM25 or an exact index is enough; vectors add cost and confusion. If queries are only natural-language paraphrases of marketing copy, dense retrieval may dominate and hybrid is extra moving parts. Do not hybrid-search a 2,000-row table you can filter in SQL. Do not tune fusion weights on anecdotes. Hybrid is the wrong first step when chunking is broken: no fusion recovers a policy split across two 512-token windows with the negation in the discarded half. Fix document preparation, then fuse.
