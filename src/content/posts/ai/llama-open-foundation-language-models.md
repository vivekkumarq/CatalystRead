---
title: "LLaMA: Open Weights, Honest Scaling, and the Stack Everyone Fine-Tuned"
slug: "llama-open-foundation-language-models"
description: "Touvron et al. trained dense transformers from 7B to 65B on a documented public-data mix and showed smaller models could match larger proprietary ones when you spend tokens well. Why the data mix and tokenizer became the real API."
publishedAt: "2026-10-15"
category: "AI"
tags:
  - AI
  - Language Models
  - Open Source
  - Research
sources:
  - title: "LLaMA: Open and Efficient Foundation Language Models"
    author: "Hugo Touvron et al."
    publisher: "arXiv 2023"
    url: "https://arxiv.org/abs/2302.13971"
---

Through 2022, the strongest language models were APIs. LLaMA released a family of dense decoder-only transformers (7B, 13B, 33B, 65B) trained on a mix the authors actually listed: Common Crawl, C4, GitHub, Wikipedia, books, arXiv, Stack Exchange. The claim was Chinchilla-flavored: spend enough tokens on a smaller model rather than undertraining a giant. Their 13B model reported competitive performance with much larger predecessors on many English benchmarks.

The industry effect was not a single number. It was a frozen architecture plus weights that thousands of labs could instruct-tune, quantize, and serve. If your 2026 stack still says "the Llama architecture" you are living in this paper's aftermath, including the tokenizer, the RMSNorm-plus-SwiGLU-plus-RoPE recipe, and the idea that data documentation is part of the model.

## Data mix is architecture

They discuss filtering Common Crawl, mixing high-quality sources, and not treating "more web" as monotonic. Replication attempts that ignore the mix and copy only the layer count miss the point. When you train a company LLM, write the mix like Touvron et al. did: percentages, filters, and what you excluded. That document will explain eval surprises better than a new attention variant.

The paper is English-heavy in its reported suite. Multilingual products that adopted LLaMA weights inherited that bias. Later Llama versions changed this; the 2023 paper is not a multilingual manifesto. Measure your languages.

## Architecture as a conservative stack

Pre-normalization, SwiGLU, rotary embeddings, no biases in some linear layers — the authors assembled pieces that were already in the literature and trained them hard. That conservatism is a feature. A novel block that you cannot stabilize is not "research taste"; it is a delay. LLaMA's win was a clean, reproducible dense baseline at several sizes so ablations elsewhere had a fair opponent.

Context length is 2048 in this paper. If you needed 32k, you needed later work (NTK-aware interpolation, longer training, different positional schemes). Do not blame the 2023 weights for a window they never had.

## A worked choice of size

You can serve 7B at decent latency on one GPU with quantization, or 65B with a small cluster. The paper's plots say 7B is not 65B. For classification with LoRA, 7B may be enough. For hard reasoning without tools, you will feel the gap. Start with the smallest size that hits the eval, because the LLaMA thesis is that tokens and data beat idle parameters.

## Failure modes

**Calling any 7B chat dump "LLaMA"** without the tokenizer and rope theta matching.

**Benchmarks in the paper as a license to skip a private eval.**

**Ignoring license and data provenance** because the file is on a hub. The paper is a technical report, not your lawyer.

**Training 65B with a 7B token budget** and wondering why Chinchilla was mentioned.


## Tokenizer as compatibility

LLaMA's SentencePiece-style tokenizer, byte fallback, and leading-space behavior are why so many "Llama-compatible" adapters break when someone swaps a fast tokenizer clone that disagrees on a single extra ID. Hash the vocab file in CI. When you continue-pretrain, do not add tokens without a plan for the embedding rows. The 2023 report is also a reminder that "open" is a spectrum: weights, data mix description, and license are different artifacts. Read all three before you fine-tune a customer-facing bot on top.

## What you can borrow

- Publish or at least internally document the data mix at the same granularity as the architecture.
- Prefer a boring, stable block stack and spend compute on tokens.
- Offer multiple sizes so products can pick a latency/quality point.
- Treat tokenizer and context length as compatibility constraints for every adapter you train.
- Do not use the 2023 LLaMA window or language mix as your 2026 multilingual long-context spec.
