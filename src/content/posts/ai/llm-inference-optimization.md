---
title: "LLM Inference Optimization: Batching, KV Cache, and Speculative Decoding"
slug: "llm-inference-optimization"
description: "The core techniques that make LLM inference fast and affordable at scale: batching, KV cache management, and speculative decoding explained."
publishedAt: "2026-07-14"
updatedAt: "2026-09-16"
category: "AI"
tags:
  - AI
  - Inference
  - LLMs
  - Performance
---

Serving an LLM efficiently is a different engineering problem than training one, and it's dominated by a fact that surprises people coming from traditional web services: generation is memory-bandwidth bound, not compute bound, for most of the time it spends producing a response. Understanding why changes what you optimize.

## Why generation is memory-bound

Producing each output token requires reading the entire model's weights (and the growing key-value cache) from GPU memory, but doing relatively little compute per token compared to that memory movement. This is why batching — processing many requests' token generation together — gives such large throughput gains: the weights get read from memory once and reused across every request in the batch, amortizing the expensive part over more useful work. A single request without batching leaves most of the GPU's compute capacity idle while it waits on memory bandwidth.

## Continuous batching solves the naive batching problem

Naive batching groups requests that arrive together and waits for the whole batch to finish before starting the next one — but requests in a batch finish generating at different lengths, so short requests sit idle waiting for the longest one to complete, wasting the GPU slots they'd otherwise free up. Continuous (or "in-flight") batching solves this by adding new requests into a running batch as soon as a slot frees up from a finished request, rather than batching at fixed intervals.

```text
Naive batching:     [A B C D] wait-for-slowest [E F G H] wait-for-slowest ...
Continuous batching: [A B C D] -> C finishes -> [A B E D] -> B finishes -> [A F E D] -> ...
```

This is the single biggest lever most inference-serving frameworks (vLLM, TensorRT-LLM, and similar) apply, and it's largely why self-hosted serving throughput improved so much once these frameworks matured — the underlying model didn't change, the scheduling did.

## KV cache: the memory cost of not recomputing attention

The key-value cache stores the attention keys and values for every token already generated, so the model doesn't have to recompute attention over the full sequence from scratch for each new token. This is essential for speed but expensive in memory — it grows linearly with sequence length and batch size, and it's frequently the actual constraint on how many concurrent requests a GPU can serve, more than the model weights themselves for long-context workloads.

```python
# Rough KV cache size per request (conceptual)
kv_cache_bytes = (
    2  # keys and values
    * num_layers
    * num_heads
    * head_dim
    * sequence_length
    * bytes_per_param  # 2 for fp16
)
```

Techniques like paged attention (managing the KV cache in fixed-size blocks rather than contiguous memory, the way an OS manages virtual memory) reduce fragmentation and let a server pack more concurrent requests into the same GPU memory. Grouped-query attention, a model architecture choice made at training time, reduces KV cache size directly by having multiple query heads share key/value heads.

## Speculative decoding: trading extra compute for lower latency

Speculative decoding uses a small, fast "draft" model to propose several tokens ahead, then has the full model verify them all in a single forward pass — accepting the ones that match what the full model would have generated and only falling back to normal generation where they diverge. Because verifying several tokens in parallel is cheap relative to generating them one at a time, this can meaningfully cut latency when the draft model's guesses are frequently correct — which tends to happen on more predictable text (code, structured output) more than on highly creative or unpredictable generation.

## What to actually tune, roughly in priority order

| Lever | Effect |
|---|---|
| Continuous batching | Biggest throughput win, minimal quality trade-off |
| KV cache memory management (paged attention) | More concurrent requests per GPU |
| Quantization | Smaller memory footprint, some quality trade-off — see quantization specifically |
| Speculative decoding | Lower latency on predictable content, extra engineering complexity |

For most teams not building their own inference stack from scratch, the practical takeaway is choosing a serving framework that already implements continuous batching and efficient KV cache management well, rather than trying to hand-roll these optimizations.

## A worked failure mode

A chat service enables continuous batching and a large KV cache on one GPU. Latency p50 looks great until a few users paste novels: their sequences pin cache memory, batch size collapses, and everyone else's p99 explodes. Speculative decoding is turned on with a draft model trained on a different domain; reject rates are high, so you pay draft cost without throughput. Another team quantizes weights to 4-bit and keeps fp16 KV, then OOMs on context they used to fit. The failure is optimizing a single kernel metric in isolation. Bound max sequence length per request, isolate heavy jobs, measure tokens per second at a realistic mix of short and long prompts, and treat KV cache as a first-class capacity budget.

## When this is the wrong tool

If traffic is a few requests per minute, buy a bigger instance or an API; custom batching kernels will not pay back. Speculative decoding is the wrong tool when the draft is inaccurate or the sequence is tiny. Quantization is the wrong tool if evals show task failure on numbers or code and you have no quality gate. Do not chase FlashAttention versions while the prompt still includes a 200k-token dump. Inference optimization is for a hot path with a cost or latency SLO, not a weekend refactor of a prototype that still has no evals.
