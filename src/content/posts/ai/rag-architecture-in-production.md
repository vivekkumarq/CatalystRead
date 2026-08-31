---
title: "RAG Architecture in Production: What Actually Breaks"
slug: "rag-architecture-in-production"
description: "A field guide to the parts of retrieval-augmented generation that fail under real traffic, real documents, and real users."
publishedAt: "2026-06-02"
category: "AI"
tags:
  - AI
  - RAG
  - LLMs
  - Vector Search
  - Embeddings
trending: true
---

Retrieval-augmented generation looks deceptively simple in a demo: embed the query, fetch the top-k chunks, stuff them into a prompt, let the model answer. In production that pipeline is maybe twenty percent of the system. The rest is ingestion jobs that keep documents fresh, retrieval that degrades gracefully when the index drifts, and a feedback loop that tells you when answers are quietly getting worse before a customer files a ticket about it.

## Retrieval quality is the bottleneck, not generation

Most teams spend their first few weeks tuning the prompt template and their next six months discovering that the model was never the problem — the retriever was handing it the wrong context. If the top-5 chunks don't contain the answer, no amount of prompt engineering recovers it. Before touching the LLM call, instrument retrieval in isolation: log query, retrieved chunk IDs, and similarity scores, then periodically sample and grade whether the *right* chunk showed up in the top-k. Teams that skip this step end up debugging hallucinations that are actually retrieval misses wearing a generation costume.

## Chunking decisions you can't undo cheaply

Chunk size and overlap are the two knobs everyone tunes once and never revisits, which is a mistake — they interact with your document types in ways that don't generalize. A 512-token chunk works for prose but shreds tables and code blocks into meaningless fragments. A practical default is structure-aware chunking: split on markdown headers, code fences, and table boundaries first, and only fall back to fixed-size windows within a section that's still too long.

```python
def chunk_document(doc: str, max_tokens: int = 400) -> list[str]:
    sections = split_on_structure(doc)  # headers, code fences, tables
    chunks = []
    for section in sections:
        if count_tokens(section) <= max_tokens:
            chunks.append(section)
        else:
            chunks.extend(sliding_window(section, max_tokens, overlap=50))
    return chunks
```

Re-chunking a live index is expensive — it means re-embedding everything and cutting over — so treat chunking strategy as a decision you make deliberately, with a versioned index you can roll back, not something you patch in place.

## Reranking closes the gap embeddings leave open

Bi-encoder retrieval (the embed-and-cosine-similarity approach) is fast but lossy — it compresses a document into a single vector before it ever sees the query. A cross-encoder reranker that scores query-chunk pairs directly catches relevant passages that embedding similarity ranks too low, and it's cheap to bolt on: retrieve top-50 with your vector index, rerank down to top-8, and only those go into the prompt. In practice this single addition improves answer grounding more than switching embedding models.

## What actually breaks at scale

A few failure modes show up almost universally once traffic grows:

| Symptom | Usual cause |
|---|---|
| Answers cite stale facts | Ingestion pipeline lags source-of-truth updates |
| Retrieval works in staging, not prod | Index built from a different chunking config than the retriever expects |
| Latency spikes under load | Reranker running synchronously on the request path without batching |
| Silent quality regression | No offline eval gate on embedding model or prompt changes |

None of these are exotic — they're operational discipline problems. Treat your retrieval index like a service with its own SLOs: freshness lag, recall@k on a golden query set, and p99 latency. Ship changes to chunking, embedding models, or rerankers behind the same regression suite you'd use for a code change, because from the model's perspective a bad chunk is indistinguishable from a bad prompt, and it will confidently answer with whatever garbage you hand it.
