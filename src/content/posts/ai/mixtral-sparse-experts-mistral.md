---
title: "Mixtral: Sparse Experts in a Dense-Looking Decoder You Can Actually Serve"
slug: "mixtral-sparse-experts-mistral"
description: "Jiang et al. replace some MLP blocks with a Mixture-of-Experts router (Mixtral 8×7B). Active parameters per token stay modest; capacity and serving constraints do not. How to think about MoE without the hype."
publishedAt: "2026-11-02"
category: "AI"
tags:
  - AI
  - Mixture of Experts
  - Language Models
  - Research
sources:
  - title: "Mixtral of Experts"
    author: "Albert Q. Jiang et al."
    publisher: "arXiv 2024"
    url: "https://arxiv.org/abs/2401.04088"
---

A dense 47B model costs 47B-worth of MLP FLOPs every token. Mixtral 8×7B keeps a 7B-scale attention stack and, in the FFN, routes each token to 2 of 8 expert MLPs. Quoted "47B parameters" is capacity; *active* parameters per token are closer to a 13B dense model. Jiang and colleagues showed that this sparse decoder matched or beat denser models on many benchmarks while decoding faster than a dense model of similar capacity.

If you already understand Shazeer-style MoE, Mixtral is a clean, open, decoder-only instance with a specific routing choice (top-2) and a serving story: you must load all experts even if you run two, unless you do expert parallelism or offload. Memory is dense-like; compute is sparse-like. That asymmetry is the whole product conversation.

## Routing is load balancing plus quality

A router scores experts; top-2 get the token (with weights). If the router collapses to two favorites, you paid for eight MLPs and use two. Auxiliary balancing losses, capacity factors, and dropped tokens are the operational guts. Mixtral's paper is relatively pragmatic about training; your fine-tune can still unbalance experts if the domain is narrow. Log expert utilization. A dead expert is unused RAM.

MoE fine-tuning (LoRA on experts vs on router vs both) is a later engineering fork. Touching only attention is safer and may under-adapt. Touching the router can smash load balance. Experiment on a slice.

## Serving is not "it's 13B"

All experts on one GPU may not fit. Expert parallelism splits experts across GPUs and adds all-to-all. Latency under small batch can disappoint because routing is irregular. Prefill vs decode behave differently. vLLM-class engines added MoE kernels for a reason. If you naive-PyTorch Mixtral, you will not reproduce anyone's tokens/s slide.

## A worked capacity conversation

Finance chatbot. Dense 13B fits one GPU, good enough. Mixtral-quality would help on rare jargon. You cannot hold 8×7B in VRAM. You either take Mixtral on two GPUs with expert parallel, or you stay dense and RAG the jargon. Mixtral is the right paper when you have the memory fabric for experts and a wide domain that uses them. It is the wrong paper when you have one 24 GB card.

## Failure modes

**Quoting 47B quality and 13B cost** in the same sentence without the memory asterisk.

**Fine-tuning that kills routing** so two experts absorb all tokens.

**Batch 1 decode comparisons** against a dense 7B on a kernel-optimized stack.

**Assuming every MoE is Mixtral's top-2 8-expert design.**


## Prefill versus decode for MoE

Prefill can use experts more densely because many tokens hit the same layer together; decode is a skinny, irregular GEMM. Kernel libraries that fuse grouped GEMMs matter more than a PyTorch `index_select` over experts. If your benchmark is training FLOPs, you will overstate decode speed. Measure tokens/s at the batch and length you serve. Also pin the router dtype; a router in fp16 that saturates will collapse routing even if the experts are healthy.

## What you can borrow

- Count active FLOPs and resident parameters separately; both are real.
- Monitor expert load; balance is a production metric.
- Plan serving (expert parallel, kernels) before you commit to MoE quality.
- Fine-tune with an eye on the router, not only LoRA on attention.
- Stay dense when memory is the scarce resource and the domain is narrow.
