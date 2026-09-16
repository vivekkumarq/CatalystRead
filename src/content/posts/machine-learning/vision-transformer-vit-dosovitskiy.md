---
title: "ViT: Image Patches as Tokens, and the Data Hunger That Came With Them"
slug: "vision-transformer-vit-dosovitskiy"
description: "Dosovitskiy et al. dropped the conv inductive bias, split images into patches, and trained a transformer on ImageNet-21k-scale data. When ViTs beat ResNets, and when they need the extra data or distillation."
publishedAt: "2026-11-19"
category: "Machine Learning"
tags:
  - Machine Learning
  - Computer Vision
  - Transformers
  - Research
sources:
  - title: "An Image is Worth 16x16 Words: Transformers for Image Recognition at Scale"
    author: "Alexey Dosovitskiy et al."
    publisher: "ICLR 2021"
    url: "https://arxiv.org/abs/2010.11929"
---

CNNs bake in locality and translation equivariance. Vision Transformer does not, at least not in the stem: you cut the image into 16×16 patches, linearly embed them, add position embeddings, and run a standard transformer encoder with a class token (or later, global pool). Dosovitskiy and colleagues showed that on large enough pretrain sets (JFT-300M / ImageNet-21k scale in the paper's setting), ViT matches or beats ResNets while being compute-efficient at pretrain time. On mid-size ImageNet-1k *from scratch*, the missing conv bias hurts unless you regularize heavily or distill (DeiT, later).

The engineering fork is data and compute, not "attention is better pixels." If you have 5k labeled photos, a ResNet-50 or a conv-stem hybrid is still the adult choice.

## Patch size is stride

16×16 on 224px is a 14×14 token grid. Smaller patches mean more tokens, quadratic attention cost, finer detail. 32×32 is cheaper and blinder. This is your resolution knob. Position embeddings are learned for a grid; interpolating them for new sizes works sometimes and is a known fine-tune trick. If you change aspect ratio a lot (wide dashcam), 2D interpolation of 1D-reshaped embeddings is a detail you must test.

Hybrid models (conv stem then transformer) add back locality. The pure ViT paper is the existence proof that you *can* go conv-free at scale. It is not a mandate to throw away a useful stem.

## Compute vs accuracy plots

They emphasize FLOPs and TPUv3 days, not only top-1. A ViT-L at 224 vs a ResNet-152 is a systems comparison. Copy their honesty: report pretrain data size. "ViT-B/16" without the pretrain set is an incomplete name.

## A worked 1k-from-scratch miss

ViT-B/16, ImageNet-1k only, light aug, 90 epochs. It loses to ResNet-50. You add RandAugment, mixup, longer training, or DeiT-style distillation. Or you pretrain on a larger set. The paper already told you this. Do not conclude transformers cannot see.

## Failure modes

**No positional embeddings.**

**Class token pooling vs mean pool** copied from the wrong descendant.

**Fine-tuning at a new resolution without interpolating posemb.**

**Quadratic cost at 512px with tiny patches** on a GPU that was fine at 224.


## Class token versus pooling

The original ViT uses a learned class token. Many later recipes mean-pool patch tokens. Mixing pretrained weights from one with a head expecting the other is a silent accuracy drop. When you load a checkpoint, assert the pooling mode. For dense prediction, you need patch tokens anyway; the class token is a classification convenience. DeiT's distillation token is yet another variant. Name the pooling in the model card the way you name the patch size.


Hardware likes ViT because it is large GEMMs. That does not mean a ViT-L is cheaper than a CNN at batch 1 on CPU. Benchmark the device you ship, not the TPU pretrain graph. Patch embedding can be a surprising fraction of time at small resolution.

## What you can borrow

- Treat patches as tokens when you have scale; use a transformer encoder as a vision backbone.
- Match model size to pretrain data; mid-size data still likes conv bias or distillation.
- Treat patch size and image size as coupled compute knobs.
- Interpolate position embeddings deliberately on resolution change.
- Keep CNNs when labels are few and pretrain is ImageNet-1k-scale.
