---
title: "AdamW: Decouple Weight Decay From the Adaptive Gradient Step"
slug: "adamw-decoupled-weight-decay"
description: "Loshchilov and Hutter showed that L2 regularization is not weight decay once the optimizer is adaptive. The decoupled decay every transformer schedule actually uses."
publishedAt: "2026-11-09"
category: "Machine Learning"
tags:
  - Machine Learning
  - Optimization
  - Deep Learning
  - Research
sources:
  - title: "Decoupled Weight Decay Regularization"
    author: "Ilya Loshchilov, Frank Hutter"
    publisher: "ICLR 2019"
    url: "https://arxiv.org/abs/1711.05101"
---

People wrote `loss + λ||w||²` and expected SGD-style weight decay. With Adam, the adaptive denominator scales that L2 gradient differently per coordinate, so the effective decay is not `λ`. Loshchilov and Hutter restore the SGD interpretation: take the Adam step on the loss gradient, *then* decay the weights by a factor (`w ← (1 - ηλ) w` style), independent of the second moment. They call this AdamW. Transformer training recipes almost all mean this when they say "weight decay 0.1."

If your code still adds L2 to the loss and passes the sum to Adam, you are not on the ViT/GPT recipe even if the YAML says `weight_decay`. Read the optimizer class.

## Why it changed generalization stories

Adaptive methods were accused of worse generalization than SGD. Part of that gap was the broken decay. AdamW narrowed it on image models in the paper and became non-negotiable in language-model land because everyone copied the same decoupled implementation. It is not a magic regularizer. It is the regularizer you thought you had.

Decay should usually skip biases and norm scales. If you decay layer-norm gains to zero, you can hurt. Most modern trainers implement a parameter group split. If you decay everything including embeddings without looking, you may be over-regularizing the one matrix that needs capacity.

## Schedules couple to decay

Because decay is multiplied with the learning rate in common implementations, a cosine LR that goes to zero also damps decay late. That may be what you want. If you implement decay as a fixed `λ` subtractor independent of `η`, you have a different algorithm. Document which. The paper discusses the relationship to the SGD decay interpretation.

## A worked YAML lie

`optimizer: adam, weight_decay: 0.01` in a framework that applies L2 in the loss. You switch to `AdamW` with decoupled 0.01 and the same peak LR. Training loss a bit higher, val better. That is the paper. If both look identical, your "AdamW" class is a wrapper that still uses L2. Print whether the update includes ` - lr * wd * w` beside the adaptive term.

## Failure modes

**Decaying all parameters including norms.**

**Huge `wd` copied from SGD recipes** (SGD's λ is not AdamW's λ).

**Calling `AdamW` but using `loss += l2`.** Double regularization.

**Comparing papers that used different coupling** of wd and LR schedule.


## Parameter groups in real trainers

A typical transformer split is: decay on matrices, no decay on 1-D (bias, norm). Embeddings are a judgment call; many LM recipes decay them, some do not. Document the split in the model card because two "AdamW 0.1" runs are not comparable if the groups differ. When you import a recipe from a GitHub README, print `optimizer.param_groups` once. The paper's contribution is the decoupling; the team's contribution is not silently decaying the wrong tensors.


A cosine schedule that hits zero LR also hits zero decay in implementations that multiply wd by η. If you wanted a floor on decay, say so and implement a minimum. Silent coupling is fine if it is documented; surprise coupling is how two labs cannot match a run.

## What you can borrow

- Apply weight decay as a decoupled term on the weights, not as L2 inside Adam's gradient.
- Exclude norm parameters and usually biases from decay unless you measure otherwise.
- Name the optimizer AdamW in configs only when the implementation is decoupled.
- Retune λ when you switch from SGD; do not copy the number.
- Keep decay and LR schedule in one diagram so you know late-training regularization.
