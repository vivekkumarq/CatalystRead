---
title: "The Transformer Architecture, Explained for Engineers"
slug: "transformer-architecture-explained-for-engineers"
description: "A practical walkthrough of self-attention, multi-head attention, and positional encoding for engineers who need to reason about transformers, not just use them."
publishedAt: "2026-03-02"
category: "Machine Learning"
tags:
  - Machine Learning
  - Deep Learning
  - Transformers
  - NLP
trending: true
---

Every modern language model you've touched, from code completion tools to translation systems, is built on the same core idea introduced in 2017: replace recurrence with attention. Once you understand why that trade worked, the rest of the architecture stops feeling like magic and starts feeling like an engineering decision you'd have made too, given the constraints.

## The problem with recurrent models

RNNs and LSTMs process sequences token by token, carrying a hidden state forward. That's a sequential dependency — you cannot compute step 50 until step 49 finishes. On modern hardware, where you have thousands of parallel cores sitting idle, that's a bad trade. It also means information from early tokens has to survive dozens of hidden-state updates to influence a decision late in the sequence, and in practice it degrades.

Transformers solve both problems at once. Every token attends to every other token directly, in a single matrix multiplication, with no sequential bottleneck.

## Self-attention, mechanically

For each token, you compute three vectors: a query (Q), a key (K), and a value (V), each via a learned linear projection of the token's embedding. The attention score between token i and token j is the dot product of i's query and j's key, scaled and passed through softmax:

```python
import numpy as np

def self_attention(X, Wq, Wk, Wv):
    Q = X @ Wq
    K = X @ Wk
    V = X @ Wv
    d_k = K.shape[-1]
    scores = Q @ K.T / np.sqrt(d_k)
    weights = np.exp(scores) / np.exp(scores).sum(axis=-1, keepdims=True)
    return weights @ V
```

The scaling by `sqrt(d_k)` matters more than it looks — without it, dot products grow large as dimensionality increases, softmax saturates, and gradients vanish. This is one of those details that's easy to skip in a from-scratch implementation and then wonder why training stalls.

## Why multiple heads instead of one

A single attention head learns one notion of "relatedness." Multi-head attention runs several smaller attention operations in parallel, each with its own Q/K/V projections, then concatenates and linearly projects the results. In practice, different heads specialize — some track syntactic dependencies, others track coreference, others attend mostly to adjacent tokens. You get this specialization for free from gradient descent; nobody hand-assigns roles to heads.

## Positional encoding: attention has no sense of order

Self-attention treats the input as a set, not a sequence — swap two tokens and the attention weights between all other pairs are unaffected. That's a problem for language, where order carries meaning. The fix is to inject position information directly into the embeddings, either via fixed sinusoidal functions or, more commonly in current architectures, learned or rotary positional embeddings (RoPE), which encode relative position by rotating query and key vectors as a function of their distance apart.

## What actually differs between encoder, decoder, and encoder-decoder stacks

| Variant | Attention pattern | Typical use |
|---|---|---|
| Encoder-only (BERT-style) | Bidirectional — every token sees every other | Classification, embeddings |
| Decoder-only (GPT-style) | Causal mask — token i only sees j <= i | Text generation |
| Encoder-decoder (T5-style) | Encoder bidirectional, decoder causal + cross-attention | Translation, summarization |

The causal mask in decoder-only models is just an additive matrix of negative infinity above the diagonal, applied before the softmax — it costs almost nothing computationally but is the entire reason these models can be trained to predict the next token without seeing the future.

## Practical implications

If you're fine-tuning rather than building from scratch, the two knobs that matter most day to day are context length (which scales attention cost quadratically, so doubling context roughly quadruples the attention FLOPs) and the number of layers versus heads per layer, which trades depth of reasoning against breadth of parallel relational tracking. Neither is free, and neither is "more is strictly better" — profile before you scale either one.
