---
title: "EfficientNet: Scale Depth, Width, and Resolution Together"
slug: "efficientnet-compound-scaling"
description: "Tan and Le replaced one-dimensional scaling with a compound coefficient that grows depth, width, and input size in a fixed ratio. NAS-found mobile blocks, and when compound scaling is the wrong knob."
publishedAt: "2026-11-18"
category: "Machine Learning"
tags:
  - Machine Learning
  - Computer Vision
  - Efficiency
  - Research
sources:
  - title: "EfficientNet: Rethinking Model Scaling for Convolutional Neural Networks"
    author: "Mingxing Tan, Quoc V. Le"
    publisher: "ICML 2019"
    url: "https://arxiv.org/abs/1905.11946"
---

People used to deepen a CNN *or* widen it *or* feed larger images. Tan and Le argue those axes interact: a deeper net wants more resolution to use the receptive field; a wider net wants more resolution to use the channels. EfficientNet picks a baseline (EfficientNet-B0, NAS-searched MBConv-ish blocks) and scales depth/width/resolution by a compound coefficient φ with a constrained FLOP budget. B1–B7 are that rule, not seven unrelated architectures.

If you "scale ResNet by 2× depth only" and compare to EfficientNet-B4, you did not run their experiment. Compound scaling is the claim.

## The baseline still matters

Compound scaling a bad B0 yields a bad B4. They spent search on mobile inverted bottlenecks with squeeze-and-excitation. If you apply the φ rule to a poorly regularized AlexNet descendant, you get a larger poorly regularized net. Steal the scaling *after* you have a strong small model.

Resolution scaling changes train-time augmentation, BN stats, and memory. B7 is not B0 with a flag; it is a different hardware problem. If your GPU OOMs at 600px, you cannot buy the paper's B7 point. Serve at a resolution you can afford; do not quote B7 accuracy at B0 latency.

## Transfer is not automatic

ImageNet-optimal φ may not be your detection-neck optimal. Detectors that used EfficientNet backbones had to retune. Classification FLOPs are not detection FLOPs. Re-run the compound idea on *your* train loop if you can: small grid on depth vs width vs res.

## A worked one-axis fail

You take B0, double resolution only, train with the same batch. Accuracy up a bit, speed destroyed, BN noisy because batch was cut. Compound scaling would have grown depth/width less aggressively and kept FLOPs in a planned envelope. Plan the envelope first (target ms), then φ.

## Failure modes

**Using unofficial B7 weights trained at the wrong image size.**

**Scaling FLOPs 2^φ without matching the paper's α,β,γ constants** and still calling it EfficientNet.

**Dropping SE blocks** from MBConv and keeping the name.

**Comparing to an unoptimized ResNet** as if that were the 2019 baseline.


## NAS versus the scaling rule

B0 came from neural architecture search around MBConv and SE. The compound coefficient is a *scaling* rule on that family. Applying φ to a random convnet is an experiment, not EfficientNet. If you only need a mobile classifier, B0 or a later MobileNet may already hit the latency cap; growing to B4 on-device is how you miss the frame rate. Use the paper to argue against one-dimensional scaling in a design review, then pick a checkpoint whose resolution matches the camera, not the ImageNet train script.


Compound scaling also interacts with regularization: larger φ often wants more dropout and stronger RandAugment. If you scale the net and keep B0 augs, you can overfit B4. Treat the training recipe as scaled too, not only the tensors in the summary table on the paper's last page.

## What you can borrow

- Scale depth, width, and resolution jointly under a FLOP or latency budget.
- Search or otherwise invest in a strong small baseline before growing it.
- Fix the serving resolution and latency first, then pick φ.
- Re-tune when the task is not 224-class ImageNet classification.
- Do not grow only depth and claim compound scaling.
