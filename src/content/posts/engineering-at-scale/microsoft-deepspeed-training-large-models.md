---
title: "ZeRO to Trillions: DeepSpeed and the Memory Wall of Large Training"
slug: "microsoft-deepspeed-training-large-models"
description: "How Microsoft's DeepSpeed library partitioned optimizer state, gradients, and parameters so teams could train models that would not fit on a single GPU's memory."
publishedAt: "2026-09-24"
updatedAt: "2026-09-24"
category: "Microsoft"
tags:
  - Engineering at Scale
  - Microsoft
  - Machine Learning
  - Distributed Systems
sources:
  - title: "ZeRO: Memory Optimizations Toward Training Trillion Parameter Models"
    author: "Rajbhandari, Rasley, Ruwase, and He"
    publisher: "arXiv / SC 2020"
    url: "https://arxiv.org/abs/1910.02054"
  - title: "DeepSpeed: Extreme-scale model training for everyone"
    publisher: "Microsoft Research Blog"
    url: "https://www.microsoft.com/en-us/research/blog/deepspeed-extreme-scale-model-training-for-everyone/"
---

Training a large neural network is a memory problem before it is a FLOP problem. A dense model does not only store weights. It stores gradients, optimizer state (Adam keeps extra tensors per parameter), and activations for the backward pass. Those extras dwarf the parameter tensor. Data-parallel training used to replicate all of that on every GPU, which meant the largest model you could train was roughly the largest model that fit on one device, no matter how many devices you rented. Microsoft's DeepSpeed library, and the ZeRO (Zero Redundancy Optimizer) papers behind it, attacked the redundancy: shard optimizer state, then gradients, then parameters across data-parallel ranks so the cluster's aggregate memory becomes the limit.

## Three stages of not copying everything

ZeRO-1 partitions optimizer state. Each rank owns a slice of Adam's moments and only updates that slice. ZeRO-2 also partitions gradients. ZeRO-3 partitions the parameters themselves: a rank materializes a full layer only when it needs that layer for compute, then discards or reduces. Communication volume grows as you shard more aggressively. That is the trade: memory headroom versus all-gather and reduce-scatter on the critical path. DeepSpeed's contribution to product teams was turning those stages into configuration flags on top of PyTorch, plus complementary tricks — activation checkpointing, mixed precision, CPU and NVMe offload — so a research group could climb from "fits on 8 GPUs" to "fits on 64 with offload" without rewriting the model.

Offload is the unglamorous hero. When GPU HBM is still too small, ZeRO-Offload and later ZeRO-Infinity push optimizer state and even parameters to host memory or NVMe, overlapping copies with compute. Throughput drops, but the run becomes possible. That matters in a world where the alternative is "wait for the next GPU SKU" or "shrink the model until the science changes."

## What still breaks when the flags look easy

DeepSpeed is not a compiler that makes topology irrelevant. A cluster with weak NVLink or a poor InfiniBand fabric will spend the job in NCCL collectives. ZeRO-3's parameter gathering is particularly sensitive to latency. Heterogeneous nodes, stragglers, and preemption in shared clouds produce deadlocks and timeouts that a single-node training loop never showed. Checkpointing becomes a distributed protocol: every rank's shard must be saved coherently, and resume must remap shards if the world size changed. Teams that checkpoint as if there were one process discover this on the first restart after a spot-instance kill.

Numeric issues hide under memory wins. Mixed precision with dynamic loss scaling, partitioned gradients, and fused kernels can diverge in ways that full-replication FP32 hid. You need the same evaluation recipe at small scale and large scale, plus a budget for "this configuration is fast and wrong." Pipeline and tensor parallelism (often combined with ZeRO, and overlapping with Megatron-style model parallel) add another scheduling dimension: bubble time, microbatches, and imbalance. DeepSpeed's Megatron and pipeline integrations exist because ZeRO alone is not always the fastest way to use a given box.

The Research Blog pitch — "extreme-scale training for everyone" — is true in the sense that the code is open. It is false if "everyone" means a laptop. The borrowable idea is the accounting: write down every tensor that training holds, decide which copies are redundant across ranks, and shard or offload those copies before you rewrite the model architecture.

## What you can borrow

- Inventory training memory by tensor class (params, grads, optimizer, activations). Replicated optimizer state is usually the first free lunch.
- Turn up sharding in stages and measure tokens per second versus memory; ZeRO-3 is not automatically faster.
- Treat host/NVMe offload as a correctness-preserving way to finish a run, then buy faster interconnects if the job is on the critical path.
- Make distributed checkpoints a tested path, including resume on a different GPU count.
- Keep a small-scale numeric baseline. Memory tricks that change reduction order can change the model.
