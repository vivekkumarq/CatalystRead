---
title: "Segment Anything: A Promptable Foundation Model for Image Masks"
slug: "segment-anything-foundation-vision"
description: "Kirillov et al. built a ViT image encoder, a prompt encoder, and a mask decoder trained on a billion masks. Why promptable segmentation is a product interface, not just a COCO score."
publishedAt: "2026-10-08"
category: "AI"
tags:
  - AI
  - Computer Vision
  - Foundation Models
  - Research
sources:
  - title: "Segment Anything"
    author: "Alexander Kirillov et al."
    publisher: "ICCV 2023"
    url: "https://arxiv.org/abs/2304.02643"
---

Classic segmentation models emit a fixed set of class-labeled pixels. Segment Anything (SAM) emits masks for *whatever you point at*. Kirillov and colleagues train a heavyweight image encoder once per image, then a cheap prompt encoder and mask decoder that take points, boxes, or coarse masks and return valid object masks, including multiple masks when the prompt is ambiguous. The data engine is the other half of the paper: a model-in-the-loop annotation process that produced the SA-1B dataset at a scale that made "foundation" more than a slide title.

The engineering interface is interactive and compositional. A user clicks. A box from a detector becomes a prompt. A text-to-box model can feed SAM. You are not retraining a 150-class head when the product manager adds "also segment the cable." You are prompting a masker.

## Ambiguity is in the spec

A click on a person might mean the person, the shirt, or the hand. SAM predicts multiple masks and a confidence-like score so the application can pick. If you take only the first mask and call the model wrong, you ignored the paper. Interactive tools should expose the alternatives; batch pipelines should define a disambiguation policy (largest mask, highest score, class from another model).

The image encoder is the cost center. Amortize it: encode once, decode many prompts. That is why demo UIs feel instant after the first pass and why naive per-click full-model runs feel broken. If you serve SAM behind a detector that proposes 300 boxes, you still want one image embedding.

## Data engine, not just architecture

They iterate between assisted manual annotation, semi-automatic, and fully automatic mask generation. The dataset's mask diversity is the reason zero-shot transfer to new image distributions works as well as it does. If you fine-tune SAM on 200 in-domain images with sloppy polygons, you can destroy that generality. Measure on the distributions you did not train on.

SAM is class-agnostic. It will happily mask a stain, a shadow, or a reflection. Downstream you still need a classifier, a tracker, or a human. Treating SAM as a panoptic segmenter with names is a category error.

## A worked detector-plus-SAM path

A warehouse camera, a YOLO-class detector for "pallet," boxes fed to SAM for cleaner masks than the detector's coarse heads, then area and overlap features for a stacking heuristic. Failures: detector misses, SAM snaps to the floor instead of the pallet, overlapping pallets yield one merged mask. You keep the detector's class and SAM's geometry, and you log mask-area outliers. That composition is the paper's intended use, not a 1,000-class ADE20K replacement.

## Failure modes

**Tiny objects and thin structures.** Foundation masks are not magic on one-pixel cables without zoom or a specialized model.

**Video identity.** SAM is per-frame; tracking is extra.

**Prompt type mismatch.** A point in a texture-heavy region vs a tight box are different problems.

**Exporting only the ViT and forgetting the prompt/decoder pair** as the product surface.

## What you can borrow

- Design segmentation as a promptable decoder on a cached image embedding, not as a closed class list.
- Return multiple masks when the prompt is ambiguous; define a picker.
- Invest in a data engine if you need SAM-like coverage; 200 polygons will not do it.
- Compose with detectors and trackers instead of asking SAM to name objects.
- Do not fine-tune away generality on a tiny, biased mask set unless that domain is the only product.
