---
title: "Bahdanau Attention: Let the Decoder Look Back at Every Encoder State"
slug: "bahdanau-neural-machine-translation-attention"
description: "Bahdanau, Cho, and Bengio replaced the single seq2seq vector with a learned weighted sum of encoder states. Alignments you can plot, and the additive scoring function later papers simplified."
publishedAt: "2026-11-25"
category: "Machine Learning"
tags:
  - Machine Learning
  - NLP
  - Attention
  - Research
sources:
  - title: "Neural Machine Translation by Jointly Learning to Align and Translate"
    author: "Dzmitry Bahdanau, Kyunghyun Cho, Yoshua Bengio"
    publisher: "ICLR 2015"
    url: "https://arxiv.org/abs/1409.0473"
---

Seq2seq's encoder packed the source into one vector. Bahdanau, Cho, and Bengio keep all encoder hidden states and, at each decoder step, compute a score between the decoder state and each encoder state, softmax those scores, and take a weighted sum (the context vector) as extra input to the decoder. The scores are a soft alignment. You can plot them and sometimes see word-to-word correspondences. Machine translation quality jumped on longer sentences, which is the empirical reason attention became non-optional.

This is *additive* attention: a small MLP on `[decoder state; encoder state]`. Luong later popularized dot-product forms. Vaswani made scaled dots the default. If you say "attention" in 2026 you usually mean the transformer. If you say "why attention exists in NMT," you mean this paper.

## Alignment is a diagnostic, not a proof

Pretty alignment plots can lie (the model still mistranslates). They are still better than a black 1024-d soup. In production, if attention is uniformly smeared, the decoder is not looking; if it is a delta on the wrong token, you have a bug or a reordering the model cannot represent. Bidirectional encoders (they used one) matter so the annotation at position `t` has right-context.

Teacher forcing plus attention can cheat in subtle ways on copy-heavy tasks. Measure generation, not only token CE.

## Computational shape

You pay O(source length) per decoder step. For translation that is fine. For very long sources you will want chunking, local attention (later), or transformers with sparse patterns. Bahdanau attention is not a 100k-token algorithm. It is the right complexity for sentence-level NMT.

## A worked copy task

Source: `A B C D`. Target: `C D A B` with a toy vocab. Without attention, a tiny seq2seq fails as length grows. With Bahdanau, alignments hop in the right order. If alignments are right and tokens are wrong, the generator softmax is the issue. If alignments are wrong, the score MLP or the bidirectional encoder is the issue. Split those failures.

## Failure modes

**Forgetting to mask encoder padding** so attention mass sits on pads.

**Using decoder state from the wrong time** (off-by-one).

**Additive attention in float16** without care; scores saturate.

**Calling transformer attention a 'Bahdanau layer'** in a design doc and confusing the team about masks and heads.


## From additive scores to production NMT

Most teams will not ship additive attention LSTMs now, but they will still implement "decoder looks at encoder." The failure modes transfer: pad masks, length mismatch, and alignments that look confident while the token is wrong. If you build a custom pointer-generator, start from this additive or dot-product block and add the copy head later. Do not start from a 12-layer transformer if the product is a 40-token form filler — Bahdanau-scale seq2seq may already be enough and is easier to debug with alignment plots.

## What you can borrow

- Condition each decoder step on a soft sum of encoder states when a single vector bottlenecks.
- Plot alignments as a debugging surface.
- Mask pads; use bidirectional source annotations when the task is offline.
- Know additive vs dot-product as different score functions with the same softmax-sum shape.
- Move to transformers when you want parallel encoding/decoding training and multi-head mixing; keep this paper for the origin of "look back."
