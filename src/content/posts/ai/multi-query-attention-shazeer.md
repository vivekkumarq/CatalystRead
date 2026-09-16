---
title: "Multi-Query Attention: One Key/Value Head, Many Queries, Smaller Decode Cache"
slug: "multi-query-attention-shazeer"
description: "Shazeer 2019 shared keys and values across attention heads to speed autoregressive inference. The quality trade versus full multi-head, and why GQA later filled the gap."
publishedAt: "2026-10-23"
category: "AI"
tags:
  - AI
  - Transformers
  - Inference
  - Research
sources:
  - title: "Fast Transformer Decoding: One Write-Head is All You Need"
    author: "Noam Shazeer"
    publisher: "arXiv 2019"
    url: "https://arxiv.org/abs/1911.02150"
---

Transformer decoding reloads past keys and values every step. Multi-head attention multiplies that bandwidth by the head count. Shazeer's multi-query attention (MQA) keeps multiple query heads but a *single* key head and value head (per layer). The attention scores still have several query views of the same K/V stream. The KV cache shrinks by roughly the head factor, and incremental decoding gets faster when you are memory bound.

This is a 2019 inference paper that quietly became a 2023–2024 default in some large decoder stacks, then got generalized by GQA. If you only learned attention from Vaswani et al., MQA is the first big serving-motivated fork of the block.

## Why quality can move

Heads in MHA are not decorative; they can specialize. Forcing them to share K and V reduces specialization. Shazeer reported speedups with limited quality loss on the translation-style setups in the paper. That is not a blanket "MQA is free." Later LLM work sometimes saw drops on tasks that look like they need diverse keys. If you convert a trained MHA model to MQA by averaging heads and serving immediately, you are running an untested architecture. Train MQA, or uptrain, then eval.

The "one write-head" framing in the title is about the incremental update: you write a smaller chunk of K/V per new token. Prefill still computes full sequences. MQA is a decode-time story first.

## Relationship to grouped-query

GQA is MQA with more than one KV head. If MQA hurts your needle eval, add groups before you revert to full MHA. Shazeer's paper is still the right citation for the cache analysis and the original trick. GQA is the interpolation knob.

## A worked ablation

Same 1B decoder, trained from scratch, MHA vs MQA, matched FLOPs as well as you can. Measure translation or language-model CE *and* tokens/s at batch 1 with a long prefix. If CE is within a hair and tokens/s jumps, MQA wins that product. If CE jumps, try GQA with 4 KV heads. Do not publish only the speedup.

## Failure modes

**Implementing a single query head** (that is not MQA; that is a tiny attention).

**Wrong broadcast of K/V across query heads** in a fused kernel.

**Serving MQA weights with an MHA graph** (shape errors or silent repeat).

**Expecting MQA to help bidirectional encoder training throughput** the same way; the cache argument is autoregressive.


## Retrofitting versus training MQA

Training MQA from scratch is the clean experiment in the paper. Retrofitting a finished MHA LLM by averaging K/V is a deployment hack. If you must retrofit, run a short uptrain (the GQA paper is the better citation for that conversion) and eval long-context tasks. MQA's bandwidth math still explains why decode traces show HBM saturation on fat-headed models. Use that math to decide whether you are memory bound before you rewrite attention.


When profiling, separate prefill from decode. MQA's win is decode bytes. A benchmark that only measures training step time will miss the point of the 2019 paper and you will keep full MHA in a latency-sensitive chat stack for no reason.

## What you can borrow

- Share K/V across query heads when decode bandwidth is the limiter.
- Train or uptrain; do not average MHA heads at export and hope.
- Keep MQA as the extreme point and GQA as the compromise.
- Benchmark batch-1 long decode, not only training tokens/s.
- Avoid MQA if your eval is sensitive and you can afford more KV heads.
