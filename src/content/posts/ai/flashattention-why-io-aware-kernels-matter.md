---
title: "FlashAttention: Why IO-Aware Kernels Matter More Than Another 2% BLEU"
slug: "flashattention-why-io-aware-kernels-matter"
description: "Dao et al. showed that attention was memory-bound, not math-bound. Here is the IO story and what it changed for long-context training."
publishedAt: "2026-07-28"
category: "AI"
tags:
  - AI
  - Performance
  - Transformers
  - GPUs
sources:
  - title: "FlashAttention: Fast and Memory-Efficient Exact Attention with IO-Awareness"
    author: "Tri Dao, Daniel Y. Fu, Stefano Ermon, Atri Rudra, Christopher Ré"
    publisher: "NeurIPS 2022"
    url: "https://arxiv.org/abs/2205.14135"
---

Standard attention materializes an `N × N` score matrix in GPU high-bandwidth memory. For a 4k context that matrix is already huge; for 16k it starts to dominate memory and the kernel spends its time waiting on loads, not computing fused multiply-adds. FlashAttention's claim is blunt: the naive algorithm is **IO-bound**. If you fuse softmax and never write the full matrix to HBM, you get exact attention (not an approximation) that is faster and uses less memory.

That is why long-context training became plausible on the same chips, and why almost every serious training stack now ships a FlashAttention-shaped kernel (or a vendor equivalent) rather than a naive PyTorch `matmul + softmax + matmul`.

## Tiling, online softmax, and exactness

The kernel loads blocks of Q, K, and V into on-chip SRAM, computes a block of scores, and updates the output incrementally using an online softmax that tracks running maxima and sums. Because softmax is numerically sensitive to the max, the algorithm has to be careful — it is not "just loop in tiles." The paper's contribution is showing you can do this without changing the mathematical result.

Approximate attention (Linformer, Performer, sparse patterns) tried to dodge the quadratic cost by changing the function. FlashAttention kept the function and changed the **memory traffic**. For many production sequence lengths, that was the better trade: you still pay quadratic compute, but you stop paying quadratic HBM writes.

## What to take into a design review

- If someone proposes "we cannot do 32k context, attention is O(n²) FLOPs," ask whether they are actually OOM on the score matrix first. Memory is often the binding constraint before FLOPs.
- If someone proposes a new approximate attention for a 2k coding model, ask for a kernel-level profile. You may already be compute-bound, and approximation would only hurt quality.
- Training and inference have different shapes. Inference decode is often memory-bound on the KV cache, which is a related but not identical IO story (FlashDecoding, paged attention, GQA). Do not cite FlashAttention as if it solved decode.

The paper is a reminder that "the algorithm" and "the algorithm as it hits the memory hierarchy" are different objects. In GPU-era ML, the second object is frequently the one that decides whether the first one can ship.
