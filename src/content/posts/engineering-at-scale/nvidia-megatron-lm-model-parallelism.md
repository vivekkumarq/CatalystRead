---
title: "Megatron-LM: Slicing Transformers Across GPUs on Purpose"
slug: "nvidia-megatron-lm-model-parallelism"
description: "NVIDIA's Megatron-LM paper showed tensor and pipeline parallelism so Transformer layers larger than one GPU's memory could still train efficiently on DGX-class boxes."
publishedAt: "2026-10-19"
updatedAt: "2026-10-19"
category: "NVIDIA"
tags:
  - Engineering at Scale
  - NVIDIA
  - Machine Learning
  - Distributed Systems
sources:
  - title: "Megatron-LM: Training Multi-Billion Parameter Language Models Using Model Parallelism"
    author: "Shoeybi et al."
    publisher: "arXiv"
    url: "https://arxiv.org/abs/1909.08053"
  - title: "Megatron-LM GitHub repository"
    publisher: "NVIDIA"
    url: "https://github.com/NVIDIA/Megatron-LM"
---

Data parallelism replicates the whole model on every GPU. When the model does not fit, you have to *slice* it. NVIDIA's Megatron-LM (Shoeybi et al.) popularized efficient *tensor parallelism* for Transformers: split weight matrices along hidden dimensions so each GPU owns a shard of a layer, then all-reduce or all-gather at well-chosen points (after attention heads merge, after MLP columns). Combined with pipeline parallelism (layers stacked across stages) and, in later stacks, sequence parallelism and expert parallelism, this became the template for training models that dwarf HBM. The paper's contribution was not the existence of model parallel (GPipe and others existed) but a mapping onto Transformer blocks that kept communication volume tolerable on NVLink.

## Tensor parallel inside a layer

Split an MLP's first linear column-wise and the second row-wise (or the Megatron-documented dual) so the GeLU happens locally and one all-reduce restores the residual stream. Attention heads split naturally across GPUs. The communication is on the critical path of every token. That is why Megatron wants NVLink-connected GPUs in the tensor-parallel group and is happier with tensor-parallel degree matching the GPUs on a node, while pipeline and data parallel span nodes. Mix that mapping up and you all-reduce over InfiniBand inside a layer, which trains, badly.

Numerics and determinism suffer as you add more reductions. So does load balance: pipeline stages need similar compute, but embedding, attention, and unembedding are not equal. Pipeline bubbles (idle time as microbatches fill the pipe) waste GPUs unless you have enough microbatches and a schedule (1F1B) that keeps stages busy. Megatron-style code is full of these scheduling details because they dominate efficiency at 100+ GPUs.

## The ecosystem that copied the paper

DeepSpeed, FairScale, PyTorch FSDP, and later Megatron-Core / NeMo all absorbed these ideas. FSDP shards like ZeRO; Megatron shards like model parallel. Production training often combines them (3D parallel: data × tensor × pipeline). Checkpoint format becomes a distributed puzzle: resharding when you change GPU count is a feature you will need the first time a cluster reservation changes.

For a mid-size team, the steal is when a model *almost* fits. Tensor parallel of 2 on a dual-GPU workstation can unblock work. Jumping to 8-way tensor parallel on a poorly connected cloud VM will not. Profile communication. The Megatron repo's configs are documentation of topology, not magic numbers to paste into a laptop.

Inference uses the same splits: tensor-parallel decode, with NCCL all-reduces per token. That is why serving a large model is a networking problem. The paper was about training; the industry applied it to both.

Activation memory is the other wall. Tensor parallel shards weights but activations can still blow HBM at long sequence lengths. Sequence parallelism and activation checkpointing are the usual partners, at a compute cost. Log per-rank allocated bytes during a short run before you book a 256-GPU job; OOM at step 2 is the most expensive way to learn the sequence length did not fit.

## What you can borrow

- Split Transformer linears so communication lands on residual boundaries, not on every inner multiply.
- Keep high-bandwidth tensor-parallel groups on NVLink islands; use pipeline/data parallel across nodes.
- Size pipeline microbatches to hide bubbles; idle stages are paid GPUs.
- Plan checkpoint resharding when world size changes; it will.
- Combine model parallel with data/ZeRO sharding only after you have measured the fabric. 3D parallel is easy to misconfigure.
