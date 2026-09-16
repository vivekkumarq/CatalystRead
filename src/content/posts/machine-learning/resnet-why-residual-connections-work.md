---
title: "ResNets: Why Skip Connections Let Us Train Hundreds of Layers"
slug: "resnet-why-residual-connections-work"
description: "He et al. 2016 showed degradation was an optimization problem. Residual blocks, identity shortcuts, and what that still means for modern networks."
publishedAt: "2026-08-02"
updatedAt: "2026-09-16"
category: "Machine Learning"
tags:
  - Machine Learning
  - Deep Learning
  - Computer Vision
  - Research
sources:
  - title: "Deep Residual Learning for Image Recognition"
    author: "Kaiming He, Xiangyu Zhang, Shaoqing Ren, Jian Sun"
    publisher: "CVPR 2016"
    url: "https://arxiv.org/abs/1512.03385"
---

Plain convolutional nets got worse as they got deeper, even on the training set. That was the puzzle. If extra layers can represent the identity, a deeper net should at least match a shallower one. He and colleagues treated that as an optimization failure: it was too hard for SGD to find identity-like mappings through a stack of nonlinear layers.

Their fix looks almost too small. Let a block learn a **residual** `F(x)` and compute `y = F(x) + x`. If the best thing a block can do is nothing, the weights of `F` can go toward zero and the skip carries `x` through. Suddenly 50-, 101-, and 152-layer ImageNet models trained cleanly, and the 2015 ILSVRC results moved.

## Identity shortcuts versus projections

When dimensions match, the skip is a literal identity — no extra parameters. When a block downsamples or changes channel count, a projection (usually 1×1 convolution) aligns shapes. The paper's experiments argued that identity skips were not only cheaper but also better behaved. Later architectures kept the idea even when the internals of `F` changed (bottlenecks, grouped convolutions, Transformers with residual streams).

The Transformer residual stream is the same instinct in a different costume: each layer is an update added to a running representation, not a total rewrite. Once you see it, a lot of "why is this architecture stable" conversations get shorter.

## Batch norm, initialization, and the rest of the recipe

ResNets did not win on skip connections alone. He initialization, batch normalization, and a training schedule that could actually run for enough epochs were part of the package. If you strip BN out of a 2016-style ResNet and keep the skips, you should not be surprised if training misbehaves. Conversely, modern ConvNeXt-style nets keep residuals while swapping the block internals.

## What to steal for non-vision work

When a deep stack is hard to train, ask whether each layer is being asked to reconstruct the whole representation. Additive updates with a highway for the old state are a strong default — in residual MLPs, in U-Nets, in diffusion backbones. When a skip would be the wrong inductive bias (you genuinely need to forget the input), say so explicitly rather than omitting the skip by accident.

The degradation plot in the paper is still the slide to show a skeptic: training error going *up* with depth is not "more capacity overfit," it is the optimizer losing the plot. Residuals were a constraint that made the optimizer's job possible.

## A worked identity path

A 34-layer plain net’s training error is *higher* than an 18-layer net on the same data. Add identity skips so a block can implement `x + F(x)` with `F` near 0. Training error of the deep net now at least matches the shallow one, then usually beats it. If you insert a projection shortcut with a large random 1×1 everywhere, you reintroduce a hard mapping at every block; keep identity when shapes match.

In a Transformer, the residual stream is the `x`; attention and MLP are `F`. Zero-init or small-init on the last linear of `F` (a later trick) is the same idea: start close to identity.

## Failure modes

**Skip around the wrong tensor.** Adding `x` to a downsampled map without a projection is a shape bug people “fix” with interpolate hacks that destroy the identity interpretation.

**Stripping BN and keeping 2016-depth.** The paper’s recipe was a bundle. Deep residual MLPs without normalization often need extra care (Init, LR).

**Residual + dropout on the skip itself.** If you drop the identity path, you no longer have a guaranteed highway.

**Exploding residuals in very deep stacks.** Some later work uses residual scaling (`x + α F(x)`). If loss explodes at depth 100+, check the scale of `F`, not only LR.

## When not to add a skip

When the layer must forget (a hard gating that zeros the past, some discrete bottlenecks). When the network is two layers and identity is not the problem. When you already have an LSTM-style gated highway and are adding a second skip that double-counts. Residuals do not replace a sane learning rate or data pipeline.

## Review checklist

- Identity shortcut wherever channel/spatial size matches.
- Degradation is diagnosed as train-error vs depth, not only val overfit.
- Block internals (BN, init) still match a known working recipe.
- Skip is not dropped out; `F` can shrink to zero.

## A worked failure mode

A team stacks 50 plain convolutions, loss plateaus, they add residuals but also change the stem, optimizer, and data on the same day. They conclude residuals "did nothing." Another ports ResNet identity maps but puts a ReLU in the wrong place so the skip cannot act as identity. Depth then hurts again. The failure is an uncontrolled ablation and an incorrect skip. Hold the rest fixed, check that a zero-initialized residual block can start as identity, and watch train loss vs depth.

## When this is the wrong tool

ResNets are the wrong tool for a 2-layer tabular net. Residual connections will not fix bad labels. Do not go 152 layers on a mobile CPU to copy a paper. Use residuals when you actually need depth and you can train it; otherwise a smaller feed-forward is enough.

Treat the counterexample as part of the spec. Someone will apply "ResNets: Why Skip Connections Let Us Train Hundreds of Layers" to a problem that only looks similar at the noun level—same words, different constraints. Require a one-page fit check: scale, consistency, failure domains, and who is on call. If two of those are guesses, run a spike, not a rewrite. The expensive bugs are not the ones in the happy-path tutorial; they are the ones where the tutorial's silent assumptions were load-bearing.
