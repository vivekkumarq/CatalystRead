---
title: "Mixture of Experts: Sparse Routing When Dense MLPs Become the Bill"
slug: "mixture-of-experts-routing-explained"
description: "How top-k expert routing works, why load balancing losses exist, and the serving problems (expert parallelism, tail latency) the Switch Transformer paper made unavoidable."
publishedAt: "2026-08-09"
category: "AI"
tags:
  - AI
  - Transformers
  - Systems
  - Research
sources:
  - title: "Outrageously Large Neural Networks: The Sparsely-Gated Mixture-of-Experts Layer"
    author: "Noam Shazeer et al."
    publisher: "ICLR 2017"
    url: "https://arxiv.org/abs/1701.06538"
  - title: "Switch Transformers: Scaling to Trillion Parameter Models with Simple and Efficient Sparsity"
    author: "William Fedus, Barret Zoph, Noam Shazeer"
    publisher: "JMLR 2022"
    url: "https://arxiv.org/abs/2101.03961"
---

A dense transformer spends FLOPs on every token in every feed-forward block. Mixture-of-Experts (MoE) replaces that block with many experts and a **router** that sends each token to one or a few of them. Total parameters can be huge; compute per token stays closer to a small dense model if routing is sparse. Shazeer's 2017 sparsely-gated MoE and the later Switch Transformer (one expert per token) are the papers that made this a systems problem as much as a modeling one.

## Routing is a tiny classifier with a huge side effect

The router is usually a softmax over experts from a linear projection of the token hidden state. Top-1 (Switch) or top-2 (many production MoEs) experts run; the rest stay idle for that token. If the router sends everyone to expert 0, you have a dense model with extra unused weights and a traffic jam on one shard.

Load-balancing auxiliary losses (and later ideas like expert-choice routing) exist because left alone, softmax routers collapse. Capacity factors — how many tokens an expert will accept this step — are the serving equivalent: overflow tokens skip or hit a residual path. That is a quality cliff you will not see in a toy notebook with eight experts on one GPU.

## Serving is expert parallelism

Experts live on different devices. A token's hidden state must be dispatched (all-to-all) to the right GPU, computed, and sent back. That communication dominates naive implementations. Batching tokens that share experts, and dealing with uneven expert popularity, is why MoE inference engineering is its own team.

Tail latency is ugly: the step waits for the slowest expert shard. A "99% of tokens are cheap" average hides a p99 that looks like the dense model you thought you avoided.

## When MoE is the wrong pitch

If you cannot afford the communication fabric, or your batch sizes are tiny (interactive decode with batch 1), sparse experts may lose to a smaller dense model distilled from the MoE. If you need bit-identical reproducibility across two serving stacks, routing plus capacity overflow is a lot of extra entropy.

Read Switch Transformer for the systems tables, not only the parameter count in the abstract. The product question is: are we buying more parameters per FLOP, and can we pay the all-to-all? If the second answer is no, the first number is a slide, not a fleet.
