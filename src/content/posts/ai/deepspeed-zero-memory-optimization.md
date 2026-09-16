---
title: "ZeRO: Shard Optimizer State, Gradients, and Parameters Instead of Replicating Them"
slug: "deepspeed-zero-memory-optimization"
description: "Rajbhandari et al. (ZeRO) split Adam's memory across data-parallel ranks so you can train models that would OOM if every GPU held a full copy. Stages 1–3, communication volume, and when not to go to ZeRO-3."
publishedAt: "2026-10-25"
category: "AI"
tags:
  - AI
  - Distributed Training
  - DeepSpeed
  - Research
sources:
  - title: "ZeRO: Memory Optimizations Toward Training Trillion Parameter Models"
    author: "Samyam Rajbhandari, Jeff Rasley, Olatunji Ruwase, Yuxiong He"
    publisher: "arXiv 2020"
    url: "https://arxiv.org/abs/1910.02054"
---

Standard data parallel is simple and memory-greedy: every rank holds parameters, gradients, and Adam's two moment buffers. Those optimizer states dominate when you train in mixed precision with fp32 master weights. ZeRO (Zero Redundancy Optimizer) shards those tensors across ranks. Stage 1 shards optimizer state, stage 2 also shards gradients, stage 3 also shards parameters and gathers them just in time for the op that needs them. Rajbhandari et al. framed this as the path to trillion-parameter training on clusters that were already good at all-reduce.

DeepSpeed made the paper a default config flag. If you have ever set `zero_stage: 2` to fit a 7B full fine-tune on a few GPUs, you have used this work.

## Communication is the other column in the table

Sharding saves memory by moving bytes. ZeRO-3 in particular gathers parameters for forward and backward, then reduces-scatters gradients. On a slow interconnect, you can fit the model and stall the step. The paper's analysis is worth reading as a budgeting exercise: memory per rank versus extra communication. NVLink-heavy boxes like ZeRO-3 more than Ethernet-heavy boxes. Offload to CPU (later ZeRO-Offload) is another point on the same curve: even more memory headroom, even more latency.

If your model already fits with DDP and your network is weak, ZeRO is a pessimization. Fit is not the only objective; tokens per second is.

## Interaction with pipeline and tensor parallel

ZeRO is data-parallel sharding. You can combine it with tensor parallel (within a node) and pipeline (across nodes). The config space explodes. Start from a known working 3D-parallel recipe rather than enabling ZeRO-3, pipeline-8, and TP-8 on the same night. The paper's contribution is the DP memory axis, not a complete cluster compiler.

## A worked fine-tune

13B full FT, Adam, 4×40 GB GPUs. DDP OOMs on optimizer state. ZeRO-2 fits. Throughput is acceptable on NVLink. You try ZeRO-3, fit a slightly larger batch, lose 30% tokens/s on your Ethernet-connected extra node. Stay at ZeRO-2. That is a successful reading of the paper: pick the stage that unblocks memory *until* communication wins.

## Failure modes

**ZeRO-3 with tiny micro-batches** so gather overhead dominates.

**Saving checkpoints incorrectly** (each rank holds a shard; naive `state_dict` is incomplete).

**Mixing precision and master weights** in a custom optimizer that ZeRO does not wrap.

**Assuming ZeRO speeds you up.** It is a memory technique.


## Checkpointing and resume are part of ZeRO

Because parameters live in shards, a naive `torch.save(model.state_dict())` on rank 0 is a footgun. Use the engine's consolidated export when you need a single file for inference, and test reload on a different world size than you trained. The first time you resume a ZeRO-3 job on 4 GPUs after training on 8, you will learn whether your conversion script is real. Document the mapping from training dtype to serving dtype; a sharded bf16 train does not magically become an fp16 vLLM snapshot.

Also watch CPU memory when offload is on. You can "fit" the GPU and then OOM the node because Adam states now live on the host. ZeRO moves pressure; it does not delete bytes.

## What you can borrow

- Shard optimizer state first (stage 1/2) when Adam buffers are why you OOM.
- Escalate to parameter sharding only when you must, and only on a fast fabric.
- Budget communication versus memory; plot tokens/s per stage.
- Use the engine's checkpoint format; shards are not full replicas.
- Skip ZeRO when DDP fits and the interconnect is the scarce resource.
