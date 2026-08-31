---
title: "Observability for LLM Applications: Tracing, Tokens, and Feedback Loops"
slug: "observability-for-llm-applications"
description: "What to actually instrument in an LLM application beyond latency and error rate, and how to close the loop from production traffic to eval sets."
publishedAt: "2026-07-22"
category: "AI"
tags:
  - AI
  - Observability
  - LLMs
  - Tracing
trending: true
---

Traditional application observability — latency, error rate, throughput — tells you almost nothing useful about an LLM application's actual health. A request can return 200 OK in 400ms with a confidently wrong or unhelpful answer, and none of your existing dashboards will show it. LLM observability needs a different set of signals layered on top of the standard ones.

## Trace the full chain, not just the model call

A single user-facing response in a RAG or agent system might involve a query rewrite, a retrieval call, a rerank step, and a generation call — sometimes several generation calls in a row. If you only log the final LLM call, you lose the ability to tell whether a bad answer came from bad retrieval, a bad rerank, or bad generation over good context. Structure traces so each step is a labeled span with its own inputs, outputs, and latency, nested under the overall request.

```python
with tracer.span("rag_request") as request_span:
    with tracer.span("retrieval") as span:
        chunks = retrieve(query)
        span.log(query=query, chunk_ids=[c.id for c in chunks], scores=[c.score for c in chunks])

    with tracer.span("rerank") as span:
        reranked = rerank(query, chunks)
        span.log(input_count=len(chunks), output_count=len(reranked))

    with tracer.span("generation") as span:
        response = generate(query, reranked)
        span.log(prompt_tokens=response.usage.input_tokens,
                  completion_tokens=response.usage.output_tokens,
                  model=response.model)
```

When a user reports a bad answer, this is what turns "the model was wrong" into an actual root cause: was the right chunk even retrieved, and if so, did the model ignore it?

## Token and cost metrics need to be per-feature, not just aggregate

A single "total tokens this month" number tells you your bill, not where it's going. Break down token usage and cost by feature, by prompt version, and ideally by customer or tenant if you're running a multi-tenant product. This is what lets you answer "did the new prompt version we shipped last week increase cost per request" or "which feature is actually driving our LLM spend" instead of discovering it retroactively when the invoice arrives.

| Dimension | Why it matters |
|---|---|
| Per feature/endpoint | Identifies which product surface drives spend |
| Per prompt version | Catches cost regressions from prompt changes before they scale |
| Per model | Tracks impact of routing decisions and model upgrades |
| Cache hit rate (if applicable) | Separates real generation cost from cache-served responses |

## Feedback loops close the gap eval sets can't

Offline evals catch known failure modes; they can't catch what you haven't thought to test for. Production feedback — explicit (thumbs up/down, corrections) and implicit (did the user rephrase and ask again immediately, did they abandon the conversation, did an agent action get manually reversed) — is the signal that surfaces failure modes your eval set doesn't cover yet. The loop that actually improves quality over time is: collect feedback, sample and review negative signals regularly, and feed confirmed failures back into the eval suite so the same regression can't ship silently again.

## What to actually alert on

Alerting on p99 latency and 5xx rate is necessary but not sufficient. Add alerts for: a sudden drop in average response length (often signals truncated or degraded generation), a spike in retries or fallback-path usage, a spike in negative feedback rate over a rolling window, and — for agents — a spike in tasks hitting the max-tool-call ceiling, which usually means something upstream changed and the agent is thrashing. None of these show up in standard infrastructure monitoring, and all of them are cheap to compute once you're already logging structured traces.
