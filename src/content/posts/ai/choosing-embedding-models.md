---
title: "Choosing and Evaluating Embedding Models for Retrieval"
slug: "choosing-embedding-models"
description: "How to pick an embedding model for your retrieval stack using benchmarks that actually correlate with your data, not just MTEB leaderboard rank."
publishedAt: "2026-06-05"
updatedAt: "2026-09-16"
category: "AI"
tags:
  - AI
  - Embeddings
  - LLMs
  - RAG
trending: true
---

Every embedding model vendor ships an MTEB leaderboard screenshot, and almost none of that ranking predicts how the model performs on your documents. MTEB averages across dozens of unrelated tasks and domains; a model that's great at clustering news articles can be mediocre at retrieving your internal API docs. The only benchmark that matters is one built from your own queries and your own corpus.

## Build a golden set before you compare anything

Pull 100-300 real user queries — from support tickets, search logs, or a domain expert writing plausible ones — and manually label which document(s) should be retrieved for each. This is tedious and nobody wants to do it, which is exactly why skipping it is the most common mistake in embedding selection. Without it, you're choosing based on vibes and marketing copy.

```python
golden_set = [
    {"query": "how do I rotate API keys", "relevant_doc_ids": ["docs/auth/rotation.md"]},
    {"query": "rate limit for webhook endpoint", "relevant_doc_ids": ["docs/webhooks.md#limits"]},
]

def recall_at_k(model, golden_set, k=5):
    hits = 0
    for item in golden_set:
        results = model.search(item["query"], top_k=k)
        if any(r.id in item["relevant_doc_ids"] for r in results):
            hits += 1
    return hits / len(golden_set)
```

## Dimensions that actually differentiate models

- **Domain fit**: general-purpose embeddings underperform on code, legal, or medical text compared to domain-tuned variants. If your corpus is specialized, test at least one domain model even if its general benchmark scores look worse.
- **Context length**: some embedding models truncate silently past a token limit, which means long chunks get scored on their first paragraph only. Check the truncation behavior, not just the advertised max length.
- **Dimensionality vs. storage cost**: a 3072-dim embedding isn't automatically better than a 768-dim one for your task, and it triples your vector storage and index build time. Many newer models support Matryoshka-style truncation — you can cut the vector to 256 dims and lose surprisingly little recall, which is worth testing before committing to the full size.
- **Asymmetric vs. symmetric retrieval**: search queries and documents are different in structure (short question vs. long passage). Models trained for asymmetric retrieval (separate query/passage encoders or instruction prefixes) usually beat symmetric ones for search use cases.

## Hosted API vs. self-hosted

| Factor | Hosted API | Self-hosted |
|---|---|---|
| Latency | Network round-trip per batch | Local, lower and more predictable |
| Cost at scale | Per-token, adds up on re-embedding | Fixed infra cost, better at high volume |
| Model control | Vendor decides updates/deprecation | You pin the exact checkpoint |
| Ops burden | None | GPU capacity planning, batching, monitoring |

If you re-embed your corpus frequently — because documents update often or you're iterating on chunking — the API cost compounds fast. Teams doing more than a few million embeddings a month usually find self-hosting a mid-sized open model pays for itself within a quarter.

## Re-run the eval on every model swap

Embedding models are not drop-in replacements for each other, even within the same vendor's lineup. A new version can shift the vector space enough that your reranker's calibration or your similarity thresholds stop making sense. Treat swapping the embedding model as a migration: re-embed the full corpus, re-run the golden-set eval, and compare recall@k side by side before cutting traffic over. Never run two embedding models against the same index — cosine similarity across incompatible vector spaces is meaningless, and you'll get retrieval results that look plausible but are actually noise.

## A worked example

You pick a candidate list (open vs API). Evaluate on *your* queries: recall@10 of a labeled set of 200 query-doc pairs. Measure dimensions, latency, cost, multilingual. Same chunking for all. A small fine-tune / adapter only after the baseline. You record that a 3% recall gain cost 4× latency.

Normalize vectors if using cosine and the model expects it.

## Failure modes

Leaderboard-only selection. Mixing embedding spaces in one index. Changing chunk size when swapping models without re-embedding. Asymmetric query vs doc models used symmetrically. PII sent to a third-party embed API against policy.

Assuming MTEB English equals your tickets.

## When this is the wrong tool

Keyword-only corpora with exact SKUs: lexical search. If documents are 20 tokens of structured IDs, a hash index wins. Do not embed every keystroke for autocomplete of known titles. A single giant LLM as "embeddings" via hidden states without a retrieval eval is guesswork. Skip weekly model shopping if the bottleneck is chunking and metadata filters.

## A worked failure mode

A search team downloads the leaderboard's top embedding, indexes 4M chunks, and ships. Queries in German and queries that are error codes both degrade. The leaderboard was English MTEB-style paraphrase. A domain model 5% lower on the public board would have kept SKUs together. They also mix cosine in the database with dot-product vectors that were never normalized, so scores are not comparable across batches. Rebuild cost is a week of silent bad search. The failure is picking embeddings as a brand instead of a retrieval metric on your query log: recall@k, MRR, and a slice for identifiers. Freeze the model version in the index metadata so you cannot half-upgrade.

A giant multilingual embedding is the wrong tool for an English-only catalog of part numbers. Do not re-embed nightly without a recall regression set. Do not assume OpenAI-vs-open-source rankings transfer to legal or medical text. Choose a model with a measured lift on your labels; stay with a slightly worse model if the index rebuild and dimension cost dominate the quality gain.
