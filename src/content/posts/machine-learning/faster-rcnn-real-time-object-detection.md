---
title: "Faster R-CNN: Make Region Proposals a Network, Not an External Search"
slug: "faster-rcnn-real-time-object-detection"
description: "Ren et al. added a Region Proposal Network that shares features with Fast R-CNN so two-stage detection could run in near real time. Anchors, RoI pooling, and when two stages still beat one shot."
publishedAt: "2026-11-14"
category: "Machine Learning"
tags:
  - Machine Learning
  - Computer Vision
  - Object Detection
  - Research
sources:
  - title: "Faster R-CNN: Towards Real-Time Object Detection with Region Proposal Networks"
    author: "Shaoqing Ren, Kaiming He, Ross Girshick, Jian Sun"
    publisher: "NeurIPS 2015"
    url: "https://arxiv.org/abs/1506.01497"
---

Fast R-CNN still depended on Selective Search for proposals — a CPU algorithm that dominated runtime. Faster R-CNN inserts a Region Proposal Network (RPN) on the same convolutional backbone: slide anchors of several scales and aspect ratios, predict objectness and box deltas, then feed the top proposals into the Fast R-CNN head (RoI pooling, classify, refine). Ren et al. share features so proposal and detection are one trained system.

Two-stage detection remains the accuracy default in a lot of scientific and industrial stacks even after YOLO-class models got good. The RPN is the idea to steal: if a search is slow and differentiable, replace it with a head.

## Anchors are a prior

You place translation-invariant anchors at each spatial location. If your objects look nothing like those aspect ratios (long cables, tiny screws), assignment suffers. Anchor-free later papers exist because this prior leaks. For a first two-stage detector, start with the paper's scales and then look at the histogram of your box shapes. Re-anchor is cheaper than a new backbone.

RoI pooling (and later RoIAlign) must not quantize away the object. Mask R-CNN's Align paper is the footnote you hit when boxes are small. If you still use coarse pooling in 2026, know why.

## Four-step versus joint training

The original describes careful training stages so RPN and detector do not destroy each other. Later implementations jointly train with losses summed. If you diverge, try the staged recipe before you invent a new neck. Two-stage systems have more losses (RPN cls/reg, head cls/reg). Log them separately. One term will dominate if the weights are wrong.

## A worked proposal starvation

RPN recall at 300 proposals is low on a crowded scene. The detector never sees the objects. You raise NMS on the RPN, more anchors, or FPN. Debugging only the classifier head will not help. Two-stage means two failure points; measure RPN recall as its own KPI.

## Failure modes

**Image scaling policies** that break anchor scales between train and serve.

**Sharing backbone weights** after training RPN and detector on different strides.

**Evaluating with oracle proposals** and then shipping RPN proposals.

**Too few proposals on dense scenes.**


## Feature pyramids arrived later

The 2015 Faster R-CNN is a single-stride map. FPN (Lin et al.) is the usual 2017 add-on for small objects. If your "Faster R-CNN" is Detectron2 defaults, you already have a pyramid, better pooling, and a different LR schedule. Cite the 2015 paper for the RPN idea; cite the stack you actually trained when you report mAP. Mixing those citations is how a team debugs the wrong decade's hyperparameters.


Labeling policy matters as much as the RPN. If annotators skip crowded boxes, the RPN learns to skip them. Audit recall of the *labels* on a gold set before you raise proposal count. Garbage proposals cannot fix missing supervision, and extra anchors will not invent boxes nobody drew.

## What you can borrow

- Replace external proposal generators with a learned RPN on shared features when you need two-stage accuracy.
- Fit anchors to your box statistics.
- Track RPN recall independently of final mAP.
- Use RoIAlign-class pooling for small or aligned objects.
- Choose single-shot when your latency budget cannot afford the second stage and AP_small is acceptable.
