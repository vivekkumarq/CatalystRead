---
title: "GPipe: Pipeline Parallelism With Micro-Batches and a Predictable Memory Story"
slug: "gpipe-pipeline-parallelism"
description: "Huang et al. split a deep net across accelerators, pump micro-batches through the pipeline, and recompute activations to fit giant models. Bubble time, batch size, and when tensor parallelism is the better split."
publishedAt: "2026-10-24"
category: "AI"
tags:
  - AI
  - Distributed Training
  - Performance
  - Research
sources:
  - title: "GPipe: Efficient Training of Giant Neural Networks using Pipeline Parallelism"
    author: "Yanping Huang et al."
    publisher: "NeurIPS 2019"
    url: "https://arxiv.org/abs/1811.06965"
---

Data parallelism replicates the whole model on every chip. When the model does not fit, you have to split it. GPipe places consecutive layers on consecutive accelerators and runs a pipeline of *micro-batches*: while chip 2 computes micro-batch `k`, chip 1 computes `k+1`. Huang and colleagues used this to train giant CNNs and a large transformer, combined with gradient accumulation so the optimizer still sees a large logical batch, and with activation recomputation so memory tracks the pipeline, not a full unroll of every layer's tensors on every chip.

The idea is older than GPipe (piped dataflow). The paper made a recipe that people could copy for TPU/GPU training of models that were "too deep to fit."

## Bubbles are the tax

At the start and end of a step, some chips wait. The bubble fraction falls as you increase the number of micro-batches relative to the number of pipeline stages. If you have 8 stages and 8 micro-batches, you will hate your utilization. If you have 8 stages and 32 micro-batches, you need a global batch large enough to slice. That couples pipeline depth to batch size, which couples it to optimization (batch-norm statistics, Adam's effective batch, generalization). GPipe is not free parallelism; it is a constraint on batch geometry.

Weight update happens after the pipeline drains (in the original synchronous design). Stale-weight async variants exist elsewhere and are a different reliability story.

## Recomputation versus storing activations

To backprop through a stage you need activations. Storing all of them on a deep pipeline blows memory. GPipe's checkpointing recomputes forward within a stage during backward. You spend FLOPs to save RAM. That trade is now standard even off-pipeline (activation checkpointing in megatron-style trainers). If you disable recompute and OOM, you did not disprove GPipe; you chose the other side of the trade.

## A worked split

A 48-layer transformer, 8 GPUs. Pipeline: 6 layers per GPU. Global batch 256, micro-batch 8 → 32 micro-batches, bubble acceptable. You then notice GPU 0 is the embedding bottleneck and GPU 7 is the softmax. Rebalance stages by parameter count *and* FLOPs, not by layer count. Uneven stages are how pipelines look "buggy" in traces.

## Failure modes

**Too few micro-batches.**

**Pipeline plus data parallel without thinking about the all-reduce of accumulated grads.**

**Batch-norm across micro-batches** with stats that do not match the logical batch you wanted.

**Assuming pipeline removes the need for tensor parallel** on huge width; sometimes you need both (1F1B later, Megatron).


## 1F1B and later schedulers

GPipe's flush-at-the-end schedule is easy to reason about and leaves more bubble than one-forward-one-backward variants used in later Megatron-style trainers. If a vendor slide says "pipeline parallel" it may not be GPipe's schedule. The memory profile changes: 1F1B can reduce stored activations relative to a naive GPipe flush. When you debug a hang, first ask which schedule you are on, then look at micro-batch count. A mismatch between documented GPipe and a 1F1B implementation is a common source of "the paper's formula does not match our traces."

## What you can borrow

- Split sequential layers across devices and fill the pipe with micro-batches when the model does not fit.
- Size micro-batch count to hide bubbles; treat that as an optimizer constraint.
- Recompute activations in-stage; measure the FLOP tax.
- Balance stages by time, not by layer index vanity.
- Prefer tensor/sequence parallel when the bottleneck is a single fat layer rather than depth.
