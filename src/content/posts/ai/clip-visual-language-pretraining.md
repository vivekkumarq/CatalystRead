---
title: "CLIP: Contrastive Pretraining as a Shared Embedding Space for Images and Text"
slug: "clip-visual-language-pretraining"
description: "Radford et al. trained image and text encoders to match captions at web scale. Zero-shot classifiers, retrieval, and why the prompt template is part of the model."
publishedAt: "2026-10-06"
category: "AI"
tags:
  - AI
  - Multimodal
  - Computer Vision
  - Research
sources:
  - title: "Learning Transferable Visual Models From Natural Language Supervision"
    author: "Alec Radford et al."
    publisher: "ICML 2021"
    url: "https://arxiv.org/abs/2103.00020"
---

Supervised ImageNet classifiers learn a fixed label set. CLIP learns to score whether an image and a string belong together. Radford and colleagues trained a vision encoder and a text encoder so that matched pairs from 400 million web (image, caption) examples have high cosine similarity and mismatched pairs do not. At test time, you turn class names into captions ("a photo of a {label}"), embed them once, and pick the class whose text embedding is closest to the image. That is a zero-shot classifier whose vocabulary is a prompt, not a trained head.

The product inheritance is everywhere: image search by query string, moderation that scores "this image matches this policy phrase," and multimodal RAG that retrieves on a joint space. If you only remember "CLIP is for zero-shot ImageNet," you missed the interface. The interface is a shared embedding space with a contrastive loss.

## InfoNCE at web batch sizes

The training loss is a symmetric cross-entropy over the batch's similarity matrix: each image should pick its caption and each caption its image. Temperature is a learned or tuned scalar. Batch size is not a detail. Contrastive learning needs hard negatives, and a small batch is a weak negative set. CLIP's compute story is as much "huge batches on the similarity matrix" as it is "ResNet versus ViT."

The paper compares vision backbones and scaling. ViT variants became the default descendant. The text tower is a transformer over BPE. If you replace the text tower with a bag of words, you lose composition ("red car" versus "car"). If you replace the image tower with a tiny CNN, you lose the zero-shot numbers people cite.

## Prompts are weights you can edit without training

Zero-shot accuracy moved with prompt engineering: ensembles of templates, more descriptive class names, and later work on learned prompts. That is a feature and a footgun. A product that hard-codes `a photo of a {x}` will silently fail on diagrams, screenshots, and medical scans. The model did not "not work." Your text distribution did not match the caption distribution.

CLIP is also not a detector. A high similarity to "a photo of a person" does not give you a box. It is not a captioner; the text encoder scores strings you propose, it does not decode an open-ended caption unless you add a generator. Teams that ask CLIP to "describe the image" are using the wrong paper.

## A worked zero-shot head

You have 40 product categories. You embed 40 templates per category, L2-normalize, average, and store a 40 × d matrix. At inference you embed the image once and take argmax cosine. You then log the top-3 scores. When the top two are close, you fall back to a supervised head or a human. That hybrid is more honest than claiming CLIP replaced labeling. CLIP replaced labeling for the easy head of the distribution and for new categories you can name in English.

## Failure modes

**Spurious text correlations.** Captions that mention watermarks, stock-photo credit, or "screenshot" leak into the space.

**Social stereotypes in web alt-text.** Zero-shot is not a fairness story.

**Using CLIP embeddings as dense classifiers on a tiny in-domain set** without calibration. Cosine is not a probability.

**Image-image retrieval with a text-tuned space** without checking whether that geometry matches your metric.

## What you can borrow

- Train (or reuse) a joint space when your interface is "score this image against this language," not a closed label set.
- Treat prompt templates as part of the shipped model; version them.
- Keep batch size and normalization (L2) explicit in any reimplementation.
- Pair CLIP-style retrieval with a fallback when scores are close or the domain is far from web photos.
- Do not use CLIP as an object detector or an open-ended captioner.
