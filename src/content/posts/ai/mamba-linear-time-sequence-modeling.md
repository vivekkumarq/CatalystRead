---
title: "Mamba: Linear-Time Sequence Mixing With Selective State Spaces"
slug: "mamba-linear-time-sequence-modeling"
description: "Gu and Dao replace attention's quadratic mixing with a selective SSM that filters information as a function of the input. When linear time is the point, and when you still want a transformer."
publishedAt: "2026-11-01"
category: "AI"
tags:
  - AI
  - Architecture
  - Sequence Models
  - Research
sources:
  - title: "Mamba: Linear-Time Sequence Modeling with Selective State Spaces"
    author: "Albert Gu, Tri Dao"
    publisher: "arXiv 2023"
    url: "https://arxiv.org/abs/2312.00752"
---

Self-attention mixes every pair of tokens and costs quadratic compute and memory in sequence length. Structured state-space models offered linear-time mixing but often lagged on discrete, information-dense language. Mamba's move is *selectivity*: the SSM parameters that decide what to remember or forget become functions of the current input, so the model can ignore noise tokens and keep a token that matters 20,000 steps later. Gu and Dao pair that with a hardware-aware parallel scan so training is not a naive sequential RNN.

The pitch to engineers is long context at linear cost, with language and genomics numbers that made people take SSMs seriously again. The pitch is not "attention is dead." Hybrid stacks (attention every N layers, Mamba elsewhere) showed up quickly because some retrieval-in-context tasks like a few global lookups.

## Selectivity is the modeling claim

Prior LTI SSMs used the same dynamics for every token. Language is not linear time-invariant in that sense: a delimiter should reset, a rare entity should persist. Making B, C, or the step-size input-dependent is how Mamba implements that. If you implement an SSM without selectivity and quote Mamba numbers, you implemented S4-class mixing. Read the ablation.

The scan kernel is the systems claim. A theoretically linear model that runs as a slow Python loop loses to FlashAttention. Mamba is a fused-kernel paper as much as an architecture paper. Porting it to a new accelerator is a project.

## Where transformers still win easily

In-context copying of a needle, some associative recall, and the entire ecosystem of serving optimizations (PagedAttention, GQA, speculative decode) are mature for transformers. Mamba's decode is recurrent and cache-friendly in a different way (state size vs KV cache). You must re-benchmark *your* length and *your* hardware. A 2k-token chatbot may not care. A 1M-token log model might.

## A worked length curve

Task: classify a 64k-token trace. Transformer attention OOMs or crawls. Mamba trains. You then add a "find the config flag in the middle" probe and Mamba lags a small-window attention hybrid. You ship the hybrid. That is a successful use of the paper: linear mixing as a default, attention as a spice.

## Failure modes

**Numerical issues in the scan** on mixed precision without the authors' kernel.

**Comparing Mamba trained for fewer tokens** to a Chinchilla-complete transformer.

**Assuming linear time means constant time.** Linear in 1M is still huge.

**Drop-in replacing every attention layer** in a pretrained transformer without retraining.


## State size versus context

An SSM carries a fixed-size state per channel, independent of sequence length, which is the decode-time contrast with a KV cache that grows forever. That state must be wide enough to hold what your task remembers. If you shrink the state to look cheap and then fail a copying probe, you did not prove linear models cannot copy; you proved the state is a bandwidth bottleneck. Log state bytes per token against KV bytes per token at your target length. The crossover point is where Mamba-style mixing starts to win on memory even before kernels shine.

## What you can borrow

- Use input-dependent SSM dynamics when you need linear mixing that can still ignore or keep tokens.
- Budget for a real scan kernel; the math without the kernel is a prototype.
- Hybridize with attention if your eval is associative recall at long range.
- Re-measure serving: SSM state vs KV cache is a different ops profile.
- Keep transformers when 8k context and a mature engine already hit the SLA.
