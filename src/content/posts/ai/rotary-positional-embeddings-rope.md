---
title: "RoPE: Rotary Position Embeddings That Travel Better Than Absolute Vectors"
slug: "rotary-positional-embeddings-rope"
description: "Su et al. rotate query and key pairs by an angle that depends on position, encoding relative offset in the dot product. Why LLaMA-style models adopted it, and what breaks at lengths you did not train."
publishedAt: "2026-10-20"
category: "AI"
tags:
  - AI
  - Transformers
  - Architecture
  - Research
sources:
  - title: "RoFormer: Enhanced Transformer with Rotary Position Embedding"
    author: "Jianlin Su, Yu Lu, Shengfeng Pan, Ahmed Murtadha, Bo Wen, Yunfeng Liu"
    publisher: "arXiv 2021"
    url: "https://arxiv.org/abs/2104.09864"
---

Absolute positional embeddings add a learned vector `p_i` to token `i`. That works until you care about relative distance, or until you want lengths past the trained table. Rotary position embeddings (RoPE) instead rotate pairs of dimensions in the query and key using a position-dependent angle, so the inner product `q_i^T k_j` depends on `i - j`. Su et al. introduced this in RoFormer and argued it matches a relative-position inductive bias without a full relative-attention implementation.

Decoder-only LLMs from LLaMA onward made RoPE the default. If you implement attention and "forget positions," or you add absolute embeddings *and* RoPE, you will debug for a week. Pick one scheme and document the theta base.

## What actually gets rotated

You do not rotate values in the original formulation; scores come from rotated Q and K. Dimensions are paired. The rotation frequency uses a base (often 10,000) that sets how fast high-frequency pairs wrap. That base is a hyperparameter. Changing it at inference to stretch context (NTK-aware, YaRN, and friends) is a later trick. The 2021 paper is the encoding, not a complete long-context product.

Because the relative structure lives in the dot product, extrapolation is *better behaved than a learned absolute table* but is not infinite. Attention still saturates; kernels still cost O(n²) unless you change them. RoPE is not a complexity paper.

## Interaction with caching

KV cache stores keys after rotation at their positions (or you store unrotated and rotate on the fly — implementation choice). Off-by-one in position indices is the classic bug: every token attends as if shifted, and loss looks merely "a bit worse" instead of crashing. Write a unit test: two tokens, known rotation, known score.

## A worked length mismatch

Train at 2048 with base 10,000. Serve at 8192 with no interpolation. Quality falls on the far tokens; needle-in-haystack dies. You then try linear interpolation of positions or a new base. Each method needs an eval at the target length, not a blog screenshot. RoPE made that research possible because there is a continuous angle to tweak. Absolute learned embeddings would have required a new table and usually a finetune.

## Failure modes

**Applying RoPE to values or to the FFN.**

**Mixing degrees and radians, or pairing the wrong dimensions** after a fused kernel rewrite.

**Changing sequence packing** so positions reset incorrectly inside a packed batch.

**Citing RoPE as the reason you can do 1M context** without a kernel and a train recipe for that length.


## Long-context recipes are extra papers

NTK-aware scaling, YaRN, and position interpolation are not in the 2021 RoFormer write-up. They are later patches on the same rotation. If you change `rope_theta` at serve time without a drop of fine-tune, you must eval retrieval-in-the-middle, not only perplexity on a sliding window. Perplexity can look fine while the model cannot use token 12,000. RoPE made those patches possible; it did not finish them.

## What you can borrow

- Prefer rotary Q/K when you want relative structure and a path to length extension.
- Unit-test position indices against the cache.
- Treat theta/base as part of the checkpoint identity.
- Evaluate at the served length; train length is not a license.
- Do not stack absolute embeddings on top of RoPE "for safety."
