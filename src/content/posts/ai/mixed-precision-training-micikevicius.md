---
title: "Mixed-Precision Training: FP16 Math With FP32 Where the Bits Actually Matter"
slug: "mixed-precision-training-micikevicius"
description: "Micikevicius et al. (2018) trained deep nets with half-precision arithmetic using loss scaling and fp32 master weights. The recipe still sitting under AMP, bf16, and most large-model trainers."
publishedAt: "2026-10-26"
category: "AI"
tags:
  - AI
  - Performance
  - Training
  - Research
sources:
  - title: "Mixed Precision Training"
    author: "Paulius Micikevicius et al."
    publisher: "ICLR 2018"
    url: "https://arxiv.org/abs/1710.03740"
---

FP32 was the default tensor type because it felt safe. Micikevicius and colleagues showed that you can run the heavy matmuls in FP16 (or later, bfloat16) if you keep a few pieces in higher precision: a master copy of weights for the update, accumulations that would underflow, and a *loss scale* so tiny gradients do not vanish in half precision. Tensor Cores made this a throughput story, not only a memory story. Almost every modern training stack's Automatic Mixed Precision is this paper plus better defaults.

If you "just cast the model to half" and training diverges, you did not falsify mixed precision. You skipped the recipe.

## Loss scaling is a numerical control loop

FP16's exponent range is narrow. Gradients in deep nets can sit below the smallest normal. Multiply the loss by a scale `S`, backprop, then unscale before the optimizer. If you see inf/nan, drop `S`; if you stay finite for a while, raise it. Dynamic loss scaling is that policy. Bfloat16's wider exponent made this less delicate on TPU/GPU generations that support it, which is why many LLM trains prefer bf16 and keep fp32 accumulation in the optimizer. The 2018 paper is still the right mental model: precision is not one knob, it is per-tensor roles.

Master weights in FP32 prevent the optimizer from rounding away small updates. Adam's moments also want more than 16 bits in many setups (fp32 states, or the later 8-bit Adam work). If you store everything in FP16, you can appear to train while the weights freeze.

## What changed after 2018

Layer-norm and softmax still often stay in fp32. FlashAttention and fused kernels have their own accumulation rules. FP8 training (later NVIDIA/Transformer Engine recipes) is mixed precision with yet another format and yet more scaling. Read the 2018 paper so you know *why* those scalers exist, not so you copy FP16 Tensor Core constraints onto an FP8 run.

## A worked divergence

A ResNet or a transformer, AMP on, static scale 2^16. First inf in backward on a rare batch. Dynamic scaling would have backed off; static scaling blows the run. You enable inf checks, skip the step, reduce scale. A second failure: you used FP16 master weights, loss looks finite, accuracy never moves. `W += lr * g` rounds to `W`. Restore fp32 masters.

## Failure modes

**Comparing AMP speedup on a tiny GPU** where you are not Tensor-Core bound.

**Loss scaled but metrics computed on scaled loss** (you log nonsense).

**Forgetting to unscale before gradient clipping.** Clip fights the scale.

**Mixing bf16 tensors with an fp16-only fused kernel.**


## Gradients, clipping, and logging

Unscale before you clip, and log the unscaled global norm. A dashboard that plots scaled norms will look like the model is exploding when you only raised the loss scale. Persist the current scale in checkpoints so resume does not start from 2^16 on a run that had backed off to 2^10. When a step skips due to inf, count skip rate; if it is more than a rare blip, your LR or init is wrong and scaling is hiding it. Mixed precision is a numerical control loop. Operate it like one.

## What you can borrow

- Assign dtypes by role: matmul in reduced precision, masters and sensitive reductions in fp32.
- Use (dynamic) loss scaling for fp16; do not treat inf as a random CUDA bug.
- Keep optimizer math wide enough that updates are representable.
- Re-validate AMP when you change kernels, batch size, or model depth.
- Do not cast everything to half as a memory hack without the rest of the method.
