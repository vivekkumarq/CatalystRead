---
title: "Grouped-Query Attention: Cut KV Heads Without Going All the Way to One"
slug: "grouped-query-attention"
description: "Ainslie et al. interpolate between multi-head and multi-query attention by sharing key/value heads across groups of queries. The serving win, the quality trade, and how to uptrain an MHA checkpoint."
publishedAt: "2026-10-19"
category: "AI"
tags:
  - AI
  - Transformers
  - Inference
  - Research
sources:
  - title: "GQA: Training Generalized Multi-Query Transformer Models from Multi-Head Checkpoints"
    author: "Joshua Ainslie, James Lee-Thorp, Michiel de Jong, Yury Zemlyanskiy, Federico Lebrón, Sumit Sanghai"
    publisher: "arXiv 2023"
    url: "https://arxiv.org/abs/2305.13245"
---

Multi-head attention (MHA) keeps a separate key and value projection per query head. At decode time that means a large KV cache: every head, every layer, every token. Multi-query attention (MQA) shares a single K/V head across all queries and shrinks that cache dramatically, sometimes with a quality cost. Grouped-query attention (GQA) is the interpolation: divide query heads into groups, one K/V pair per group. Ainslie et al. show you can land near MHA quality at closer-to-MQA memory, and they give a way to *uptrain* an existing MHA checkpoint into GQA instead of training from scratch.

If you serve long-context LLMs, this paper is why your config has `num_kv_heads` as a distinct number from `num_attention_heads`.

## The cache is the product

Prefill can still be compute-heavy. Decode is often memory-bandwidth bound because you reload KV every new token. Reducing KV heads reduces bytes moved. GQA is not a new scoring function; it is a sharding of K and V. Quality depends on whether those shared heads still span the roles MHA had learned. Too few groups and you converge toward MQA's failure modes (some tasks drop). Too many and you paid nothing.

The uptraining recipe matters for anyone sitting on MHA weights. Mean-pooling or otherwise fusing K/V heads, then a short continued train, is cheaper than a new pretrain. If you skip the uptrain and only average heads at export, expect a silent eval drop. The paper is an conversion method, not only an architecture.

## Interaction with other serving tricks

GQA stacks with RoPE, with FlashAttention-style kernels, and with paged KV caches. It does not replace quantization. It does not fix a quadratic prefill if you still materialize huge QK^T without a fused kernel. Pick the bottleneck: if VRAM is KV-dominated at 32k context, GQA is on the short list. If you are 2k context and compute bound on a huge batch, the win shrinks.

## A worked config

A 32-query-head model. MHA: 32 KV heads. MQA: 1. GQA: 8 groups (4 queries per KV). You measure MMLU-like and a long-context needle eval, plus GB of cache at 16k. If needle drops and MMLU does not, you under-provisioned KV for retrieval-in-context. Raise groups. If both are flat and cache is still huge, look at quantization and paging next. Do not change GQA, RoPE theta, and context length on the same day.

## Failure modes

**Export bugs:** repeating the wrong KV head across a group, off-by-one in the reshape.

**Uptrain too short** after converting a well-trained MHA model.

**Comparing GQA 7B to MHA 7B trained for different token counts.**

**Assuming GQA helps encoder-only BERT serving** the same way; decode-time KV is an autoregressive story.


## Kernel and shape contracts

GQA only pays off if the attention kernel actually groups K/V. A PyTorch `repeat_interleave` that expands KV back to full MHA shapes before a dense kernel can erase the memory win and still look "correct" on a toy test. Inspect the cache tensor: `num_kv_heads` should be smaller than `num_heads` in the stored layout. When you export to ONNX or a custom runtime, add a unit test that a 32-head / 8-kv model cannot be loaded into a graph that expects 32 kv heads. Most serving bugs in this family are shape contracts, not math.

## What you can borrow

- Split query head count from KV head count; tune groups against cache bytes and quality.
- Convert MHA checkpoints with a dedicated uptrain, not a one-shot average at inference.
- Measure long-context tasks, not only short multiple choice.
- Combine GQA with paging and fused attention rather than treating it as a standalone miracle.
- Do not go full MQA by default if you have room for a few KV heads and a sensitive eval.
