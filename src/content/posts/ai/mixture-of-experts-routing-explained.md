---
title: "Mixture of Experts: Sparse Routing When Dense MLPs Become the Bill"
slug: "mixture-of-experts-routing-explained"
description: "How top-k expert routing works, why load balancing losses exist, and the serving problems (expert parallelism, tail latency) the Switch Transformer paper made unavoidable."
publishedAt: "2026-08-09"
updatedAt: "2026-09-16"
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

## A worked routing step

A batch of 8,192 tokens, 64 experts, top-1 Switch routing, capacity factor 1.25. Each expert should see about `8192/64 = 128` tokens if the router is uniform; capacity allows `128 × 1.25 = 160`. If expert 7 attracts 400 tokens, 240 overflow. Those tokens skip the expert MLP or hit a residual — quality drops on exactly the tokens the router was most confident about. A training log that only reports mean routing probability will look healthy while overflow rate on a few experts is 30%.

Plot tokens-per-expert as a histogram every N steps. Auxiliary load-balancing loss should flatten that histogram; if it does not, the coefficient is too small or the router inputs are collapsed (similar hidden states). Expert-choice routing (experts pick tokens) inverts the queueing problem; it is not a free lunch — unpopular tokens may be unpicked.

## Failure modes

**Router collapse** to a handful of experts: unused parameters, overloaded shards, worse quality than a dense model of the active size.

**All-to-all congestion** at decode with tiny batches: dispatch overhead exceeds the MLP savings.

**Non-determinism.** Capacity overflow plus dropped tokens means two engines can disagree on the forward pass for the same input.

**Checkpoint mismatch.** Saving expert shards independently and restoring with a different world size silently permutes experts.

## Operational gotchas

Expert parallelism wants a fast interconnect. Ethernet-only clusters often lose the MoE bet. Watch p99 step time, not mean FLOPs. For serving, pack requests so tokens that share experts batch; a naive FIFO of batch-1 chats will look like a dense model with extra latency. Distill to dense if the product is chat at batch 1 and you cannot afford packing.

## Review checklist

- Overflow / dropped-token rate is a first-class metric next to loss.
- Load-balancing loss (or expert-choice) is on, and expert histograms are inspected.
- Serving plan includes all-to-all, packing, and p99 expert-shard tail.
- Reproducibility needs are written down before promising bit-identical evals.
