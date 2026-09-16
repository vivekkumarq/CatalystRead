---
title: "PaLM: Pathways-Scale Dense Models and What Actually Moved the Benchmarks"
slug: "palm-pathways-language-model"
description: "Chowdhery et al. trained a 540B dense decoder with Pathways on TPU pods. Discontinuous jumps on reasoning, multilinguality, and the infrastructure story behind a single giant dense model."
publishedAt: "2026-10-16"
category: "AI"
tags:
  - AI
  - Language Models
  - Scaling
  - Research
sources:
  - title: "PaLM: Scaling Language Modeling with Pathways"
    author: "Aakanksha Chowdhery et al."
    publisher: "Journal of Machine Learning Research, 2023"
    url: "https://arxiv.org/abs/2204.02311"
---

PaLM is what happens when you take the GPT-3 recipe — dense decoder-only transformers, next-token prediction — and push it to 540 billion parameters on Google's Pathways system. Chowdhery and colleagues report not only benchmark tables but the training infrastructure: how to keep a huge TPU pod busy, how they configured parallelism, and which evaluation tasks showed smooth scaling versus jumps.

The jump that got cited was chain-of-thought style reasoning and certain BIG-bench tasks that looked nearly flat until the largest model. That is a planning warning. If you only train the 8B cousin and conclude "this task is impossible for LMs," you may be measuring a size threshold, not a law of nature. Conversely, if you only read the 540B numbers, you will spec a model you cannot serve.

## Pathways is part of the paper

A 540B dense model is a distributed systems project. Pipeline and sharded data parallelism, replica scheduling, and failure recovery decide whether the run finishes. The architecture details (SwiGLU, parallel attention/FFN in some blocks, RoPE, shared input-output embeddings) matter, but they are not why this paper has "Pathways" in the title. If you are not on TPU pods, the transferable lesson is: write the training system first, then the novel layer. Lost steps from stragglers dominate clever kernels when the job is this big.

They also discuss dataset construction at scale (filtered web, books, code). Contamination and memorization get more acute as capacity grows. PaLM's few-shot numbers on public suites should be read with the same suspicion GPT-3 invited: did the 540B model see the test? Use private evals for ship gates.

## Discontinuities versus smooth scaling

Some metrics improve predictably with scale. Others sit near chance until they do not. The paper's discussion of these discontinuities is more useful than any single SuperGLUE clone. For product forecasting, plot your actual task versus size on the models you can afford. Do not interpolate a 540B point from an 8B failure and a blog post.

PaLM's multilingual and code results were part of the argument for mixing those domains into pretraining rather than treating them as add-on fine-tunes only. If your PaLM-like run is English-only, do not expect PaLM-like translation anecdotes.

## A worked scaling check

You have 8B, 62B, and a 540B-class teacher you can only distill from. On a retrieval-augmented customer FAQ task, 8B already saturates because the documents do the work. On a multi-hop internal policy question without retrieval, you see a jump at 62B and cannot afford 540B. You invest in retrieval rather than chasing PaLM. The paper tells you scale can unlock skills; it does not tell you that your task is one of those skills.

## Failure modes

**Citing PaLM to justify an untested 10x parameter increase** when your bottleneck is data or eval.

**Ignoring serving:** 540B dense is a research artifact for most companies.

**Copying architectural nits** (parallel layers) without the rest of the training recipe.

**Treating discontinuous benchmark gains as aligned product behavior.**

## What you can borrow

- Log which tasks scale smoothly and which jump; do not forecast from one size.
- Treat the training orchestrator as a first-class design, not a cluster afterthought.
- Mix code and multilingual data if those are product surfaces, not only English web.
- Use PaLM-scale numbers as an existence proof, then distill or retrieve down to a serveable model.
- Do not start a 540B dense train to fix a RAG pipeline that cannot retrieve the right paragraph.
