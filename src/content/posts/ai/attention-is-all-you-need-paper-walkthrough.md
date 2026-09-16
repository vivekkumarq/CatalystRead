---
title: "Attention Is All You Need: What the 2017 Paper Actually Changed"
slug: "attention-is-all-you-need-paper-walkthrough"
description: "A field reading of Vaswani et al.: why dropping recurrence unlocked GPU training, and which pieces of the original transformer teams still keep."
publishedAt: "2026-07-21"
updatedAt: "2026-09-16"
category: "AI"
tags:
  - AI
  - Transformers
  - Deep Learning
  - Research
sources:
  - title: "Attention Is All You Need"
    author: "Ashish Vaswani et al."
    publisher: "NeurIPS 2017"
    url: "https://arxiv.org/abs/1706.03762"
---

Before 2017, strong sequence models were mostly recurrent. Attention already existed as an add-on on top of LSTMs (Bahdanau et al., Luong et al.). Vaswani and colleagues made a sharper claim: you can throw the recurrence away and let attention do the whole job of mixing information across positions. The paper is famous because that bet paid, not because it invented the word "attention."

The engineering consequence showed up immediately. Training no longer had a sequential hidden-state chain, so a TPU or GPU could spend the step on large matrix multiplies. Translation quality on WMT, at the time, jumped while training time dropped. Everything since — BERT, GPT, T5, the models behind coding assistants — is a descendant of that training-time argument.

## The original stack, as specified

The paper describes an encoder-decoder for machine translation. Six encoder layers, six decoder layers. Each encoder layer is multi-head self-attention plus a position-wise feed-forward network, with residual connections and layer normalization. The decoder adds masked self-attention so position `i` cannot see the future, and cross-attention into the encoder output.

Scaled dot-product attention is written as:

```text
Attention(Q, K, V) = softmax(QK^T / sqrt(d_k)) V
```

The `sqrt(d_k)` term is in the paper for a reason they spell out: without scaling, dot products grow with dimension and softmax saturates. If you reimplement this and "simplify" the scale away, you are not implementing the paper.

Positional encodings were fixed sinusoids in the original, added to embeddings. The authors already noted that learned positional embeddings worked similarly. The industry later moved to relative and rotary schemes because absolute sinusoids get awkward when you want contexts far past the training length.

## What did not survive unchanged

Label smoothing, the particular warmup learning-rate schedule, and byte-pair encoding as described are era-specific. Decoder-only language models dropped the encoder entirely. Encoder-only BERT dropped the causal mask. Mixture-of-experts replaced the dense feed-forward block on some layers. FlashAttention changed the IO pattern of the same math.

None of that contradicts the paper's thesis. The thesis was architectural: global mixing via attention is enough, and it parallelizes. Later work is about cost, length, and data, not a return to LSTMs as the default.

## How to read it as a practitioner

Read section 3 and table 1, then the ablation in section 5. The ablations are the antidote to mysticism — heads, depth, and key size are treated as knobs with measured BLEU, not as philosophy. When a vendor slide says "we use a transformer," ask which of those knobs they moved and what they measured. That is the same scientific habit the paper is asking for.

If you only remember one sentence from the introduction: replacing recurrence with attention was a systems decision about hardware utilization as much as a modeling decision about long-range dependencies. Both readings are correct, and both still govern why inference is expensive today (attention is still quadratic in naive form) and why GPUs are the default (the remaining work is dense linear algebra).

## A worked example

A 2-layer toy transformer: embed, add positional encodings, multi-head attention (`softmax(QK^T / sqrt(d_k)) V`), residual+norm, FFN. You implement one head, then split `d_model` across heads. Teacher-forcing a tiny translation pair. You compare a causal mask vs none to see cheating on future tokens.

Count parameters vs an RNN of similar depth on the same task — attention's win was quality at scale and parallelism, not a 10-line demo.

## Failure modes

Forgetting the scale `sqrt(d_k)` (softmax saturates). No mask on decoder self-attention. Mixing up encoder-decoder cross-attention queries vs keys. Positional encoding omitted then wondering why order dies. Treating "attention is all you need" as "no FFN."

Copying 2017 dropout rates into a 2024 LLM recipe.

## When this is the wrong tool

Tabular data with 20 features: gradient boosting. Tiny sequences where an LSTM is enough. The paper's architecture is the wrong tool if you need strictly linear time at 1M tokens without approximations. CNNs still win some vision backbones (even if ViTs exist). Do not cite the paper to skip evaluation. RNNs remain fine for tiny on-device models with no GPU.
