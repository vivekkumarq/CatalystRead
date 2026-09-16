---
title: "SentencePiece: Unsupervised Tokenization You Can Train on Raw Text"
slug: "sentencepiece-unsupervised-text-tokenizer"
description: "Kudo and Richardson built a language-independent trainer for subword models (BPE and unigram) that sits on raw sentences, not whitespace-tokenized words. Why tokenizer choice is a model API."
publishedAt: "2026-11-07"
category: "AI"
tags:
  - AI
  - Tokenization
  - NLP
  - Research
sources:
  - title: "SentencePiece: A simple and language independent subword tokenizer and detokenizer for Neural Text Processing"
    author: "Taku Kudo, John Richardson"
    publisher: "EMNLP 2018"
    url: "https://arxiv.org/abs/1808.06226"
---

Word-level vocabularies fail on morphology, typos, and languages without spaces. Character-level sequences are long. Subword tokenizers split the difference. SentencePiece's contribution is a *software and algorithm package* that trains BPE or unigram language-model segmentation directly from raw sentences, treating the input as a sequence of Unicode characters (with a dedicated meta-symbol for spaces). You do not need a language-specific word tokenizer in front. Kudo and Richardson aimed this at NMT pipelines; it became the default trainer behind a huge number of translation and LLM tokenizers.

If you have ever loaded `tokenizer.model` next to a checkpoint, you have SentencePiece's worldview: the tokenizer is a serialized model, not a regex you reimplemented in three languages.

## BPE versus unigram in one tool

Byte-pair encoding merges frequent pairs. The unigram LM in SentencePiece maintains a vocabulary with probabilities and can sample segmentations, which is useful as regularization. The paper's point is that both live behind one train/detokenize API. Switching algorithms without retraining the neural net is not supported in the way people hope: the vocabulary identity *is* the input embedding table. Change SentencePiece, retrain or at least resize and continue-train embeddings.

Space handling is the bug farm. SentencePiece's `▁` (U+2581) marks word starts when you trained that way. Detokenization is not `" ".join`. If you detokenize like Python split, you will glue or split wrong and then blame BLEU on the model. Use the library's detokenizer. Always.

## Language independence is a design, not a miracle

A shared 32k vocab across 100 languages will starve rare scripts. SentencePiece will still *run*. Multilingual fairness is a vocab-size and data-mix problem. Train the tokenizer on the mix you actually pretrain on, or rare languages become long character soups and your "max length" clips them first.

## A worked mismatch

You train T5 on SentencePiece A, then serve with SentencePiece B that used a different byte-fallback policy. Loss is fine in tests that retokenize consistently; production users with emoji hit `<unk>` or exploded token counts. Latency and context both die. Freeze the `.model` file in the same artifact as the weights. Version it.

## Failure modes

**Whitespace-pre-tokenizing then also running SentencePiece** so spaces are double-encoded.

**Training tokenizer on a different corpus** than the LM.

**Manual string replace detokenization.**

**Huge vocab that looks "expressive"** but destroys batching because everything is one token except the words you care about, which fragment.


## Character coverage and byte fallback

A vocab that cannot represent a user language will either emit `<unk>` or, with byte fallback, explode one word into many tokens and blow the context budget. Inspect token-length histograms per language *before* you freeze a 32k model. Retraining SentencePiece after pretraining is a new model. If you must add tokens (a company name, a control token), add a few rows and continue-train rather than rebuilding the whole vocab. The trainer is cheap; the embedding table is not.

## What you can borrow

- Train subword models on raw text with a single serialized artifact; ship it with the net.
- Pick BPE vs unigram deliberately; unigram's sampling is a regularizer, not a free upgrade.
- Always detokenize with the official inverse, including the space meta-symbol.
- Fit vocab size to the language mix; do not starve scripts.
- Never swap tokenizer files independently of embedding weights.
