---
title: "LoRA: Fine-Tune the Delta, Not a Second Full Copy of the Weights"
slug: "lora-low-rank-adaptation"
description: "Hu et al. inject trainable low-rank matrices into frozen linear layers so adaptation is small, swappable, and close in quality to full fine-tuning on many language and diffusion tasks."
publishedAt: "2026-10-04"
category: "AI"
tags:
  - AI
  - Fine-tuning
  - Efficiency
  - Research
sources:
  - title: "LoRA: Low-Rank Adaptation of Large Language Models"
    author: "Edward J. Hu, Yelong Shen, Phillip Wallis, Zeyuan Allen-Zhu, Yuanzhi Li, Shean Wang, Lu Wang, Weizhu Chen"
    publisher: "ICLR 2022"
    url: "https://arxiv.org/abs/2106.09685"
---

Full fine-tuning of a large transformer means storing an optimizer state for every parameter and shipping a whole new checkpoint per task. LoRA's bet is that the *update* to a weight matrix is low rank. Freeze `W`, learn two thin matrices `A` and `B` so the layer computes `(W + BA)x` (with a scaling factor), and you have adapted the model with a file measured in megabytes instead of tens of gigabytes.

Hu and colleagues demonstrated this on GPT-2/3-class language models and on generation quality that tracked full fine-tunes for the ranks they tried. The industry consequence was adapters as a deployment unit: one frozen base, many LoRA heads, merge at load or at serve time. If you are still duplicating 7B checkpoints for each customer tone, you are paying a storage tax the paper already itemized.

## Where to attach the adapters

The original experiments put LoRA on attention projection matrices and discussed leaving MLPs frozen as a cost choice. Later practice often adapts more layers, including MLP linears, especially for domain shifts that are not just "style of attention." Rank `r` is not a moral value. Rank 8 on query/value can be enough for a style shift and too small for a new language. If you do not sweep `r` and dropout on the adapter, you are guessing.

Initialization matters. Typical recipes start `B` at zero so the adapter is identity at step zero and does not smash the base model in the first batch. Learning rates for LoRA are often higher than for full FT because there are fewer parameters. Copying the full-FT LR is a common underfit.

## Serving is the other half of the paper's value

Training cheaper is nice. The operational win is swapping adapters without reloading 16-bit weights, or merging `W' = W + BA` for a single-task endpoint so inference looks like a dense model. Multi-adapter serving (different customers, different `B`/`A`) needs a policy for memory and for which request hits which adapter. None of that is in the 2021 math, and all of it is why LoRA won in products.

Merging is not free of numerical fuss if you quantize the base and keep adapters in higher precision. That is QLoRA's story. Plain LoRA assumes you can afford the base in the precision you train.

## A worked adapter choice

A 7B instruct model, legal-clause classification. You freeze the base, add rank-16 LoRA on all attention linears, train one epoch on 8k labels. You compare against a classification head on frozen embeddings. If the head already hits the SLA, LoRA is extra moving parts. If the domain vocabulary is new, LoRA on MLP layers as well is the next experiment, not a larger rank on Q only. Rank is capacity; attachment point is inductive bias.

## Failure modes

**Training LoRA on a base you will not ship.** The adapter is not portable across architectures or tokenizer versions.

**Leaky eval.** The adapter memorizes the 8k train prompts that also sit in the test set.

**Stacking adapters that were trained independently** and hoping they compose. They often fight.

**Forgetting to merge for latency-sensitive single-tenant serving** and paying extra GEMMs forever.

## What you can borrow

- Treat the update as low rank by default when you need many task variants of one base model.
- Start adapters at identity (zero `B`) so early steps cannot destroy the pretrained compute you paid for.
- Sweep rank and which linear maps you adapt; do not cargo-cult "QKV only."
- Use merge-for-serve when there is one adapter per endpoint; keep them separate when you multiplex tenants.
- Do not LoRA a problem that a linear probe on frozen features already solves.
