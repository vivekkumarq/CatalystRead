---
title: "PagedAttention: Treat the KV Cache Like a Virtual-Memory Problem"
slug: "pagedattention-vllm-serving"
description: "Kwon et al. (vLLM) allocate KV cache in pages, remap on the fly, and stop wasting giant contiguous buffers on every sequence. Throughput, sharing for prefixes, and the operational model of an LLM OS."
publishedAt: "2026-10-22"
category: "AI"
tags:
  - AI
  - Inference
  - Serving
  - Research
sources:
  - title: "Efficient Memory Management for Large Language Model Serving with PagedAttention"
    author: "Woosuk Kwon et al."
    publisher: "SOSP 2023"
    url: "https://arxiv.org/abs/2309.06180"
---

LLM serving dies on memory even when FLOPs are free. Each request's key/value cache grows with tokens, and naive engines pre-allocate a contiguous max-length buffer per slot. Most sequences are shorter than the max, so you fragment or over-reserve and then admit fewer concurrent jobs. Kwon and colleagues analogize this to virtual memory: split KV into fixed-size pages, keep a block table per sequence, and implement attention that gathers from those pages (PagedAttention). The vLLM system around that kernel is how a lot of teams actually serve open models.

The paper is systems research, not a new architecture. Transformers stay transformers. You get higher occupancy because reserved memory tracks *used* tokens, plus tricks like sharing pages for identical prefixes (the same system prompt across users).

## Fragmentation was the silent capacity killer

If you allocate 8k slots for a 2k prompt, you paid 4× KV. Multiply by batch. Paging lets you grow. The cost is indirection: attention kernels must understand block tables. If your custom fused kernel assumes contiguous KV, you cannot drop in paging without a rewrite. That is why this landed as an engine (vLLM) rather than a two-line PyTorch change.

Prefix sharing is a product feature hiding in the allocator. Twenty concurrent chats with the same 1k-token policy prompt should not store twenty copies of those keys. Copy-on-write when the user suffix diverges is the natural next step. If your prompts are all unique, sharing will not save you; paging still will.

## Scheduling is the other half of SOSP

Iteration-level scheduling, prefill versus decode mixing, and how you batch heterogeneous lengths determine tokens per second. PagedAttention makes mixed lengths less punitive. It does not pick your SLO. A prefill-heavy workload still needs a policy so one 32k prompt does not stall interactive decode. Read the system, not only the kernel diagram.

## A worked occupancy check

You serve a 13B model on one 80 GB GPU. Contiguous max-length reservation admits 4 concurrent 8k chats. Paging admits 12 at the same p95 because most chats are 1–2k. You then add a 32k analysis job and watch decode latency spike. The fix is a separate pool or a prefill cap, not "more paging." Memory managers do not replace admission control.

## Failure modes

**Page size so small** that block-table overhead and gather inefficiency eat the gain.

**Page size so large** that you reinvent internal fragmentation.

**Prefix caching stale weights** after a LoRA swap; pages are not a cache of *model* identity unless you key them.

**Assuming PagedAttention reduces compute** of attention; it reduces wasted RAM and improves batching.


## Prefix cache invalidation

Shared prompt pages are a cache. Invalidate them when LoRA adapters, speculative draft models, or tokenizer versions change. A hit on a page computed with yesterday's adapter is a silent correctness bug, not a speedup. Key the cache by `(model_id, adapter_id, prompt_hash)`. Also size the pool for the *worst* concurrent decode length you admit, not the average; paging reduces waste but cannot admit a 128k job on a GPU that cannot hold 128k of KV for even one user.

## What you can borrow

- Allocate KV in pages with a block table; stop reserving max sequence length contiguously for every slot.
- Share prefix pages for repeated system prompts.
- Pair paging with an admission policy for long prefills.
- Treat the serving engine as the unit of adoption; do not half-port the kernel into a contiguous-only stack.
- Do not expect paging to fix a model that does not fit even at batch 1.
