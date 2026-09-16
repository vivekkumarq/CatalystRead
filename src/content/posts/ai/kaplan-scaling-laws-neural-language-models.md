---
title: "Kaplan Scaling Laws: Loss as a Power Law in Size, Data, and Compute"
slug: "kaplan-scaling-laws-neural-language-models"
description: "Kaplan et al. 2020 fitted smooth power laws for transformer language-model loss. What the laws still help you plan, and which extrapolation the Chinchilla generation had to unwind."
publishedAt: "2026-10-18"
category: "AI"
tags:
  - AI
  - Scaling
  - Language Models
  - Research
sources:
  - title: "Scaling Laws for Neural Language Models"
    author: "Jared Kaplan, Sam McCandlish, Tom Henighan, Tom B. Brown, Benjamin Chess, Rewon Child, Scott Gray, Alec Radford, Jeffrey Wu, Dario Amodei"
    publisher: "arXiv 2020"
    url: "https://arxiv.org/abs/2001.08361"
---

Before Kaplan et al., people scaled language models the way they scaled everything else: try a bigger one if the smaller one helped. This paper treated test loss as a quantity you could plot on log-log axes against parameters, dataset size, and compute, and get a straight-ish line. The operational fantasy it enabled is real: you run a series of small models, fit an exponent, and guess how much loss a 10× spend will buy. GPT-3's planning sat in that culture.

The exponents they reported, and especially the implied split between growing parameters versus data, were later revised by Hoffmann et al. That does not make the 2020 paper a mistake in the sense of "plots are fake." It makes it a fit on a particular training setup (including how long they trained relative to size). Fits are not physics constants. They are excellent project-management tools when you re-estimate them on *your* tokenizer, data, and schedule.

## What to take from the plots

Loss improves predictably over a wide range. There is no magic cliff in the small-model regime they studied for next-token log loss. That is still why you can do IsoFLOP-style pilots. The paper also talks about overfitting when data is small relative to parameters, and about the idea that you should not blindly train a huge model on a tiny corpus. That warning survived every later scaling paper.

They study transformers, not "neural nets" in general. CNNs and LSTMs can have different slopes. If you cite Kaplan to size a recommender, you are decorating a slide.

## Where people over-applied it

Smooth loss is not smooth product metrics. A 0.05 drop in CE can be a new skill or nothing, depending on the task. Kaplan-style plots will not tell you when chain-of-thought appears. They also will not tell you about alignment tax, tokenizer games, or eval contamination.

The compute-optimal allocation they suggested put more emphasis on parameters than Chinchilla did. If your 2026 planning doc still uses 2020 allocation rules, update the doc, not just the bibliography. Keep the 2020 contribution: *measure a scaling trend before you bet the company on one run*.

## A worked pilot

You train 50M, 150M, and 500M on the same mix, same tokens-per-parameter ratio (use a modern one), plot eval CE. If the line is not roughly log-log linear, your data pipeline is broken, your LR is wrong, or you are already repeating data into overfitting. Fix that before a 30B job. That use of Kaplan is healthier than quoting their table of exponents from memory.

## Failure modes

**Extrapolating two points.** You need a series.

**Mixing architectures on one plot** and fitting a single slope.

**Optimizing CE while the product is retrieval quality.**

**Ignoring inference cost**, which the training-loss law does not price.

## What you can borrow

- Plot loss against scale on log-log axes for pilots; demand a trend before a hero run.
- Re-fit exponents on your stack; do not tattoo 2020 numbers on a 2026 cluster.
- Watch for overfitting when parameters outrun unique data.
- Use CE scaling as a health check, not as a proxy for every product KPI.
- Do not treat Kaplan allocation rules as the last word on tokens versus parameters.
