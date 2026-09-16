---
title: "QLoRA: Fine-Tune 65B-Class Models on a Single GPU Without Pretending 4-Bit Is Free"
slug: "qlora-efficient-finetuning"
description: "Dettmers et al. combine 4-bit NormalFloat quantization, double quantization, and paged optimizers with LoRA so large models fit in consumer memory. What is exact, what is approximate, and where quality actually drops."
publishedAt: "2026-10-05"
category: "AI"
tags:
  - AI
  - Fine-tuning
  - Quantization
  - Efficiency
sources:
  - title: "QLoRA: Efficient Finetuning of Quantized Language Models"
    author: "Tim Dettmers, Artidoro Pagnoni, Ari Holtzman, Luke Zettlemoyer"
    publisher: "arXiv 2023"
    url: "https://arxiv.org/abs/2305.14314"
---

LoRA already shrank the trainable parameter set. QLoRA attacks the other wall: the frozen base still has to sit in GPU memory. Dettmers and colleagues store that base in a 4-bit NormalFloat (NF4) encoding designed around the typical distribution of pretrained weights, quantize the quantization constants themselves ("double quantization"), and use paged optimizers so a spike in the Adam moment buffers does not OOM the run. Gradients and LoRA weights stay in higher precision. The headline was a 65B-class model fine-tuned on a 48 GB GPU.

This is not "training in 4-bit arithmetic" as a slogan. Forward of the base is dequantized to compute dtype (often bfloat16) on the fly. You pay extra math to save memory. If your bottleneck is tokens per second on a cluster that already holds 16-bit weights, QLoRA is the wrong lever. If your bottleneck is "we have one box and a weekend," it is the paper that made that weekend real.

## NF4 and why a generic int4 grid was not the point

Neural weights are roughly normal after training. A uniform integer grid wastes codes on the tails and under-resolves the mass. NF4 assigns quantization bins so that each bin is roughly equally used under a Gaussian assumption. Blockwise quantization keeps local scale. Double quantization then compresses those scales so the extra metadata does not eat the savings.

If you swap NF4 for a naive absmax int4 because your runtime only has that kernel, you are not reproducing QLoRA's quality story. Measure perplexity or a task eval against a 16-bit LoRA baseline before you declare victory.

## Paged optimizers are a systems footnote that saves runs

Adam stores two moment tensors per trainable parameter. LoRA keeps that set small, but spikes still happen. The paper's use of unified memory paging is an admission that peak memory, not average memory, kills fine-tunes. If your framework OOM-kills at 99% of VRAM, you do not have a math problem, you have an allocator problem. QLoRA treated that as in-scope.

## A worked memory budget

You want to adapt Llama-class 33B on a 24 GB card. 16-bit weights alone do not fit. 4-bit base plus rank-64 LoRA on attention and MLP might. You still need activations for a reasonable sequence length; gradient checkpointing is part of the recipe whether the paper's abstract mentions your framework or not. If you then raise batch size until you OOM, you did not "fail at QLoRA." You spent the memory you just freed on a bigger batch. Pick one: longer context, larger batch, or higher rank.

## Failure modes

**Serving the 4-bit training snapshot without a merge/export path.** Training precision and inference precision are different products.

**Comparing QLoRA-tuned chat models to 16-bit base models on chat benches** and attributing the whole gap to quantization. Instruction data quality usually dominates.

**NF4 in training, a different 4-bit scheme in production** without an eval. The adapter saw one noise pattern.

**Ignoring tokenizer and chat template mismatch** while debugging "quantization loss."

## What you can borrow

- Quantize the frozen base, not the adapter, when memory is the constraint and you still want LoRA-quality updates.
- Use a quantizer matched to weight distributions (NF4 in this paper) rather than the first int4 kernel in your stack.
- Track peak memory and page optimizer state; average VRAM lies.
- Always keep a 16-bit LoRA or full-FT reference on a slice of data so you know what 4-bit costs.
- Do not QLoRA when the model already fits in 16-bit and your eval is sensitive to tiny quantization noise (some classification heads).
