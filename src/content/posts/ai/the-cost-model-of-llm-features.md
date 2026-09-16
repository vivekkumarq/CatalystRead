---
title: "The Cost Model of LLM Features: Estimating and Controlling Spend"
slug: "the-cost-model-of-llm-features"
description: "A framework for estimating LLM feature costs before shipping and the concrete levers that control spend once traffic scales beyond a prototype."
publishedAt: "2026-08-07"
updatedAt: "2026-09-16"
category: "AI"
tags:
  - AI
  - Cost Optimization
  - LLMs
  - Inference
---

An LLM feature's cost at prototype scale tells you almost nothing about its cost at production scale, because the two are dominated by different things. A prototype's cost is dominated by whichever model you happened to pick. A production feature's cost is dominated by how many tokens each request actually consumes, how often it's called, and whether anyone put a ceiling on either — and that's usually where the surprise invoice comes from.

## Build the cost model before you ship, not after the bill arrives

The estimate you need has three inputs: average input tokens per request, average output tokens per request, and expected call volume. Input tokens are the one teams consistently underestimate, because they forget everything that goes into the prompt beyond the user's literal message — system instructions, few-shot examples, retrieved context, conversation history. A RAG feature with five retrieved chunks at 400 tokens each has already spent 2,000 tokens before the user's question or the answer.

```python
def estimate_monthly_cost(
    requests_per_day: int,
    avg_input_tokens: int,
    avg_output_tokens: int,
    input_price_per_mtok: float,
    output_price_per_mtok: float,
) -> float:
    daily_input_cost = requests_per_day * avg_input_tokens / 1_000_000 * input_price_per_mtok
    daily_output_cost = requests_per_day * avg_output_tokens / 1_000_000 * output_price_per_mtok
    return (daily_input_cost + daily_output_cost) * 30
```

Run this with realistic numbers, including the RAG context, conversation history, and system prompt, not just the user-visible message — the gap between the naive estimate and the real one is usually the whole story.

## Output tokens are usually more expensive per token — and more controllable

Most providers price output tokens higher than input tokens, and output length is also the dimension you have the most direct control over. A prompt that asks for a two-sentence answer and gets one costs a fraction of one that rambles for a paragraph when a sentence would do. Explicit length constraints in the prompt, combined with a `max_tokens` cap as a hard backstop, are the cheapest cost lever available and the one most teams under-use because it feels like a product decision rather than an infra one — it's both.

## Model routing is the highest-leverage lever after that

Not every request in a feature needs the most capable model available. A common and effective pattern: route based on task complexity, using a smaller/cheaper model for classification, extraction, or simple lookups, and reserving the larger model for genuinely hard reasoning or high-stakes generation.

| Task type | Reasonable routing choice |
|---|---|
| Intent classification, routing | Small/fast model |
| Simple extraction, formatting | Small/fast model |
| Multi-step reasoning, complex synthesis | Larger model |
| High-stakes user-facing generation | Larger model, worth the cost |

The classification step itself can be a small model call or even a non-LLM classifier, which means the routing decision costs a fraction of what running everything through the largest model would.

## Caching and reuse compound with routing

Prompt caching (reusing the processed representation of a static prefix — system instructions, few-shot examples — across requests that share it) cuts cost on the input side for any feature with a stable prompt prefix and high call volume, often substantially. Semantic caching of full responses helps further for repetitive query patterns. Neither replaces the other — prompt caching helps every call that shares a prefix regardless of whether the query is a repeat; semantic caching avoids the call entirely when the query is a near-duplicate of one already answered.

## Set a budget with an actual enforcement mechanism

The last piece is the one that prevents a bug — an infinite retry loop, a runaway agent, a scraper hitting your endpoint — from turning into a real financial incident. Per-user and per-feature rate limits, a hard `max_tokens` on every call, and a circuit breaker that halts a feature if its hourly spend crosses an anomaly threshold are cheap to build and turn a potential five-figure mistake into a contained, alertable one. Cost control for LLM features isn't a one-time estimate — it's the same operational discipline as any other resource with a per-unit cost that scales with traffic, and it needs the same guardrails.

## A worked failure mode

A product estimates cost as `requests * $0.002` from a blog. Real traffic has 8k-token RAG prompts, 15% retries, a judge model on every call, and image tokens on 20% of requests. The invoice is 12x the spreadsheet. Finance cuts the feature instead of the hidden second model. Another team offers unlimited chat because "tokens are cheap," then one tenant pastes logs. The failure is an incomplete unit economics: prompt vs completion vs cached vs embedding vs moderation vs retries vs evals in production. Put a per-tenant budget, log cost per successful user outcome (not per request), and make retries and judges first-class line items.

## When this is the wrong tool

A full FinOps dashboard is the wrong tool before you have a single successful workflow. Do not optimize model size to save pennies while retrieval fetches megabytes. Do not use list prices without the discount and the cache hit rate you actually see. If the feature is rare and high value (fraud review), spend more on quality than on token shaving. Cost models are for features that will run at volume or that can be abused; they are not a reason to skip evals.
