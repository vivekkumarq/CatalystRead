---
title: "ResNets: Why Skip Connections Let Us Train Hundreds of Layers"
slug: "resnet-why-residual-connections-work"
description: "He et al. 2016 showed degradation was an optimization problem. Residual blocks, identity shortcuts, and what that still means for modern networks."
publishedAt: "2026-08-02"
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
