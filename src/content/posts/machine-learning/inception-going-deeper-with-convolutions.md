---
title: "Inception: Multi-Scale Convolutions in One Block, and the Cost of Naïve Width"
slug: "inception-going-deeper-with-convolutions"
description: "Szegedy et al. (GoogLeNet) stacked 1×1, 3×3, and 5×5 paths with pooling, using 1×1 bottlenecks to keep FLOPs in check. Auxiliary classifiers, and why multi-scale blocks still reappear."
publishedAt: "2026-11-17"
category: "Machine Learning"
tags:
  - Machine Learning
  - Computer Vision
  - Deep Learning
  - Research
sources:
  - title: "Going Deeper with Convolutions"
    author: "Christian Szegedy et al."
    publisher: "CVPR 2015"
    url: "https://arxiv.org/abs/1409.4842"
---

VGG-style nets go deeper with 3×3 stacks. GoogLeNet goes *wider* at each layer: an Inception module runs 1×1, 3×3, 5×5 convolutions and pooling in parallel and concatenates. Szegedy and colleagues needed that multi-scale field of view without a parameter explosion, so they placed 1×1 convolutions as bottlenecks before the expensive filters (inspired by Network-in-Network). The 22-layer ILSVRC 2014 winner was this block plus global average pooling and auxiliary classifiers mid-network.

The idea that survived: let the net pick scale, and pay for 5×5 only after reducing channels. EfficientNet, Inception-v2/v3's factorizations, and even some MixConv designs are relatives. A naïve "stack 5×5 everywhere" is what they were avoiding.

## Auxiliary classifiers were a training crutch

Deep nets in 2014 still struggled to carry gradient. Auxiliary heads added extra losses. Later, better init and batch norm made them optional. If you copy auxiliary heads into a ResNet-50 with BN, you may be adding noise. If you train a 2014-style deep net without BN, you may still want them. Match the era of the rest of the recipe.

Global average pooling instead of giant FC layers cut parameters and overfitting. That change is easy to steal and still correct for classification.

## Factorize later, but remember the bottleneck

Inception v3 famously factorizes 5×5 into 3×3 stacks and uses asymmetric convs. The 2014 paper is the block diagram and the 1×1 reduction. When you widen a model, ask whether you reduced channels before the expensive spatial conv. That one question prevents a lot of accidental FLOP bombs.

## A worked FLOP surprise

You add a 5×5 path "like Inception" without 1×1 reduction on a 512-channel map. Training slows, VRAM dies. You insert 1×1 to 64 channels, then 5×5, then concat. The paper's figure is a resource diagram. Draw it with channel counts, not only with cute towers.

## Failure modes

**Concat channel mismatches** in a custom Inception.

**Auxiliary losses weighted so high** the main head is neglected.

**Padding mismatches** so parallel paths have different spatial sizes.

**Citing GoogLeNet to justify any wide module** including unbottlenecked 7×7s.


## Auxiliary heads in a modern trainer

If you revive auxiliary classifiers, down-weight them (the original used 0.3-scale losses) and drop them at inference. They are training-only. Also note GoogLeNet's aggressive bottlenecking: channel counts in the 2014 table are the real architecture. A "wide Inception" that ignores those counts is a different net. When a compiler fuses the parallel paths, check that ReLU placement still matches; fusion bugs like to move activations across the concat.


For transfer, GoogLeNet-era checkpoints are rare compared with ResNet. Prefer a modern Inception-v3 descendant only if you already depend on that family. Otherwise take the bottleneck idea and put it in a ResNet or EfficientNet you can actually download, quantize, and serve with an official public checkpoint on disk.

## What you can borrow

- Parallel multi-scale convs with 1×1 bottlenecks when objects appear at mixed sizes.
- Prefer global average pooling over huge dense classifiers.
- Treat auxiliary heads as optional once normalization and residuals exist.
- Count channels before spatial kernels.
- Use residual 3×3 stacks when you want a simpler, better-supported default than 2014 Inception.
