---
title: "Semantic Caching for LLM Cost Reduction"
slug: "semantic-caching-for-llm-cost-reduction"
description: "How semantic caching cuts LLM spend by reusing responses to meaningfully similar queries, and the correctness traps that come with it."
publishedAt: "2026-07-06"
category: "AI"
tags:
  - AI
  - Caching
  - LLMs
  - Cost Optimization
  - Embeddings
---

Exact-match caching catches the same string sent twice, which in most real applications is a small fraction of traffic — users phrase the same question a dozen different ways. Semantic caching catches "what's your refund policy" and "how do refunds work" as the same underlying question, which is where the real cost savings live for high-traffic, repetitive-query applications like support bots and internal search.

## The basic mechanism

Embed the incoming query, search a cache of previously-answered queries by vector similarity, and if something above a similarity threshold exists, return the cached response instead of calling the model.

```python
def get_cached_or_generate(query: str, threshold: float = 0.92):
    query_vec = embed(query)
    match = cache_index.search(query_vec, top_k=1)

    if match and match.score >= threshold:
        record_cache_hit()
        return match.cached_response

    response = call_llm(query)
    cache_index.insert(query_vec, response, ttl=cache_ttl_for(query))
    record_cache_miss()
    return response
```

The threshold is the entire product decision compressed into one number, and it's worth treating that way rather than picking 0.9 because it looked reasonable.

## The threshold trade-off is a correctness problem, not a tuning knob

Set the similarity threshold too low and you'll serve a cached answer to a question that's superficially similar but actually different — "what's your refund policy for annual plans" matching a cached answer about monthly plans is a wrong answer delivered with full confidence, which is worse than no cache at all because the user has no reason to doubt it. Set it too high and the cache barely fires, and you've added latency and infrastructure for negligible savings. There's no universal safe number; it depends on how semantically distinct your query space is and how costly a wrong-but-confident answer is for your use case.

A practical mitigation: don't cache based on similarity alone for high-stakes answers. Add a cheap secondary check — does the cached answer's key entities (plan names, dates, amounts) actually match entities extracted from the new query — before serving a cache hit for anything where being wrong has real consequences.

## Cache invalidation is the part nobody plans for upfront

A cached answer is only valid as long as the underlying facts are. If the refund policy changes, every cached response about refund policy is now confidently wrong until it expires. Tie cache TTLs to how volatile the underlying information is, not a single global default — pricing and policy answers need short TTLs or explicit invalidation hooks tied to your CMS/database updates; answers to genuinely static questions (how a feature works, conceptually) can cache much longer.

| Query type | Suggested TTL strategy |
|---|---|
| Pricing, policy, inventory | Short TTL + explicit invalidation on source update |
| How-to / conceptual | Long TTL, safe to cache aggressively |
| Personalized (account-specific) | Do not semantic-cache across users |
| Time-sensitive ("what's new this week") | Very short TTL or exclude from cache entirely |

## Measure hit rate against savings, not in isolation

A high cache hit rate feels like a win, but the number that matters is dollars saved versus the infrastructure cost of running the cache (embedding every query, maintaining the index, the latency cost of the cache lookup itself on a miss). For low-traffic applications, the embedding call on every query can eat a meaningful chunk of the savings semantic caching was supposed to provide. It's most worth building for high-volume, repetitive-query workloads — a support bot fielding thousands of daily variations on a few dozen actual questions is the textbook case; a low-traffic internal tool with highly varied queries usually isn't.
