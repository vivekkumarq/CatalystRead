---
title: "YOLO: Detection as One Regression Over a Grid, Not a Multi-Stage Pipeline"
slug: "yolo-you-only-look-once"
description: "Redmon et al. framed object detection as a single CNN pass that predicts boxes and class probabilities on a spatial grid. Speed as a product constraint, and the localization trade that later YOLO versions kept renegotiating."
publishedAt: "2026-11-13"
category: "Machine Learning"
tags:
  - Machine Learning
  - Computer Vision
  - Object Detection
  - Research
sources:
  - title: "You Only Look Once: Unified, Real-Time Object Detection"
    author: "Joseph Redmon, Santosh Divvala, Ross Girshick, Ali Farhadi"
    publisher: "CVPR 2016"
    url: "https://arxiv.org/abs/1506.02640"
---

R-CNN-family detectors proposed regions, then classified them. YOLO said: divide the image into an S×S grid, let each cell predict bounding boxes and class scores in one forward pass, train with a multi-part loss on box coordinates, objectness, and classification. Redmon et al. optimized for real-time — 45 FPS in the original paper's setting — and accepted that a coarse grid struggles with small objects and unusual aspect ratios.

That trade is the paper. If you need every distant pedestrian, a two-stage detector or a later multi-scale YOLO may win. If you need a camera loop on an embedded GPU, single-shot grid detection is still the shape of the solution, even if the 2016 backbone is gone.

## The loss is a pile of heuristics

Coordinates, sqrt-of-width tricks, objectness versus class, λ weights for box vs empty cells — the original loss is a carefully unbalanced sum because most cells are empty. If you reimplement YOLO and "simplify to cross-entropy," you will train a classifier that ignores boxes. Read the loss section like production code.

Non-max suppression is part of the system. The net's many overlapping boxes are not a bug. If you skip NMS, you will count three people. If you NMS too aggressively, you will merge two. Thresholds belong in the eval, not only in a demo GIF.

## What did not survive 2016

The specific GoogLeNet-ish backbone, the 7×7 grid, and the two-boxes-per-cell design were era choices. Anchor-based and anchor-free descendants, FPN necks, and better assignment (OTA, etc.) are later. Citing Redmon to justify a 2026 YOLOv8 train is history, not a recipe. Citing it to justify *single-pass detection as the product architecture* is fair.

## A worked small-object miss

Warehouse SKUs on a far shelf. Grid cell is huge relative to the box. Recall dies. You raise input resolution, add a finer grid or an FPN, or two-stage the small objects. The failure is the 2016 inductive bias, not "CNNs cannot detect." Measure AP_small, not only mAP.

## Failure modes

**Training on un-normalized box coordinates** in the wrong cell frame.

**Class imbalance** with empty cells dominating.

**Eval without the same NMS as production.**

**Square-image letterboxing ignored**, so boxes shift.


## Assignment and later YOLO heads

2016 YOLO's cell assignment (object center falls in a cell, two boxes per cell) is not YOLOv5/v8 assignment. If you debug a modern YOLO with the 2016 loss in your head, you will misread objectness. Use the 2016 paper to explain single-shot detection to a new teammate, then read the actual head you compiled. Input letterboxing, stride, and the list of class names must match between train and ONNX. Most "YOLO is bad in prod" tickets are a 4-pixel shift from preprocessing.


Class taxonomy changes require retraining the head, not a prompt. If you add a class in production YAML but not in the weight file, you will silently drop or remap IDs. Version the names file with the ONNX the same way you version a tokenizer.

## What you can borrow

- Put detection in one network when latency is the spec; jointly predict geometry and class.
- Weight the loss so empty space cannot dominate.
- Keep NMS (or a learned replacement) in the shipped pipeline and in the eval.
- Watch small-object AP when the grid is coarse.
- Use two-stage or multi-scale methods when recall on tiny instances is the business metric.
