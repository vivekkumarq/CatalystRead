---
title: "SimCLR: Contrastive Visual Learning With Augmentations as the Task"
slug: "simclr-contrastive-visual-representation"
description: "Chen et al. showed that a simple InfoNCE setup with strong augmentations, a projection head, and large batches learns ImageNet features without labels. What to copy, and why the batch is part of the algorithm."
publishedAt: "2026-11-21"
category: "Machine Learning"
tags:
  - Machine Learning
  - Self-Supervised Learning
  - Computer Vision
  - Research
sources:
  - title: "A Simple Framework for Contrastive Learning of Visual Representations"
    author: "Ting Chen, Simon Kornblith, Mohammad Norouzi, Geoffrey Hinton"
    publisher: "ICML 2020"
    url: "https://arxiv.org/abs/2002.05709"
---

SimCLR takes two augmented views of an image, encodes them with a CNN, maps them through a small MLP projection head, and trains InfoNCE so the two views agree while other batch members are negatives. Chen et al. ablated augmentations (crop plus color is crucial), the projection head (you throw it away for downstream), nonlinear heads, and batch size. The punchline was that this simple framework, at enough scale, approached supervised ImageNet representations.

If you implement contrastive learning with weak augs and batch 32, you did not implement SimCLR. The paper is a systems-and-aug paper wearing a loss.

## Augmentations define invariance

Random crop (with flip) plus strong color distortion tells the model that color jitter is not the identity of the object. If your downstream task *is* color (ripeness, brand logos), you may have trained away the signal. Customize augs to the invariances you want. SimCLR's default is object-centric ImageNet taste.

The projection head absorbs information that is useful for the contrastive task but harmful for the linear probe. That is why you linear-probe the backbone, not the head. Fine-tuning can recover some of it. Do not ship the projection MLP as your embedding without measuring.

## Batch size is negative supply

InfoNCE needs negatives. SimCLR uses other in-batch examples, so bigger batches (they go to 4096) help. Later MoCo used a queue to relax this. If you cannot host large batches, use a memory-bank method or SimCLR will look "disproven." Temperature τ is a sharpness knob; sweep it.

Normalized embeddings (L2) are part of the usual implementation. Unnormalized InfoNCE behaves differently. Stay consistent with a known recipe.

## A worked color-task fail

You SimCLR-pretrain on fruit photos with default color jitter, then linear-probe ripeness. It fails. You reduce color distortion, keep crops. Ripeness recovers, instance discrimination may weaken. The algorithm is doing what you asked. Write the invariance spec first.

## Failure modes

**Using the same two views** (no aug), collapse.

**Evaluating the projection head.**

**Tiny batch, no queue, declaring contrastive dead.**

**Supervised fine-tune that overwrites a good encoder** with a huge LR on all layers from the start — use layer-wise LR or freeze then unfreeze.


## Collapse and constant embeddings

If all embeddings are nearly identical, InfoNCE has collapsed. Watch the std of the embedding norms and the average cosine to random negatives. Stop-gradient cousins (SimSiam, BYOL) exist because people wanted smaller batches. If you cannot SimCLR-scale the batch, switch methods rather than slowly decaying to a constant vector. Also keep two views' code paths identical except for the augmentation draw; a bug that applies crop to view1 and resize-only to view2 is an accidental easy task.


Distributed SimCLR needs a correct gathering of negatives across GPUs; if you only contrast within a replica, you silently shrank the batch. Log the effective negative count. A broken all-gather is the usual reason a multi-GPU run underperforms a single-GPU large-batch run. Fix the gather before you raise temperature or add fancy augs.

## What you can borrow

- Define self-supervision as agreement under augs you actually want as invariances.
- Discard the projection head for downstream embeddings.
- Supply enough negatives (batch or queue).
- Normalize embeddings and sweep temperature.
- Switch methods if your batch cannot grow and you will not add a queue.
