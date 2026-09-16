---
title: "ELECTRA: Pretrain by Detecting Replaced Tokens, Not Only by Masking Them"
slug: "electra-replaced-token-detection"
description: "Clark et al. train a discriminator to tell original tokens from plausible replacements a small generator inserted. Sample-efficient encoder pretraining, and when MLM is still simpler."
publishedAt: "2026-11-05"
category: "AI"
tags:
  - AI
  - NLP
  - Pretraining
  - Research
sources:
  - title: "ELECTRA: Pre-training Text Encoders as Discriminators Rather Than Generators"
    author: "Kevin Clark, Minh-Thang Luong, Quoc V. Le, Christopher D. Manning"
    publisher: "ICLR 2020"
    url: "https://arxiv.org/abs/2003.10555"
---

Masked language modeling only supervises the 15% of tokens you mask. The rest of the forward pass is underused. ELECTRA trains a small MLM generator to propose replacements and a discriminator to classify every position as original or replaced. Clark and colleagues showed strong GLUE-style results with less pretrain compute, especially in the small-model regime where BERT-base budgets hurt.

The product reading: if you are pretraining an encoder from scratch on a modest cluster, replaced-token detection is a sample-efficiency trick worth a bake-off against MLM. If you are downloading BERT, you are not obligated to reimplement ELECTRA.

## Two networks, one you keep

The generator is a means of producing hard negatives. You typically throw it away and fine-tune the discriminator as your encoder. Training stability depends on not letting the generator get so weak that replacements are obvious or so strong that they are indistinguishable too early. The paper discusses weight sharing and size ratios. If your discriminator accuracy is 99% on replacements from step 100, the generator is too dumb and you are not learning language, you are learning "this position looks weird."

Unlike MLM, the discriminator's objective is binary at each position, not a full softmax over the vocab. That is cheaper and different. You cannot fill masks with ELECTRA-as-trained; it is not a generative encoder. Downstream you still add a classification head, same as BERT.

## When MLM wins on simplicity

MLM has one loss, one model, and a huge ecosystem. ELECTRA's extra generator is more moving parts, more hyperparameters, more ways to diverge. For a one-off research pretrain on a known recipe, MLM may be the right default *even if* ELECTRA is more efficient on paper. Efficiency claims need your tokenizer, your data, and your batch size.

## A worked small-encoder bake-off

Same C4 slice, same steps, BERT-MLM vs ELECTRA. Fine-tune both on a 5k-label ticket classifier. If ELECTRA wins by 1 point at half the GPU hours, you keep it for the next domain-adaptive pretrain. If they tie, you keep MLM so the next hire can read Devlin et al. and the code. That is an adult outcome.

## Failure modes

**Using the generator as the encoder.**

**Generator size matching the discriminator**, blowing the compute you meant to save.

**Evaluating ELECTRA as a masked filler** in a demo.

**Leaky replacements** that copy the original token too often, so the discriminator learns nothing.


## Domain-adaptive pretraining

ELECTRA's sample efficiency is most visible when you continue-pretrain an encoder on a specialized corpus (tickets, logs, contracts) with a limited GPU budget. The generator should stay small so most FLOPs hit the discriminator you will actually fine-tune. Keep a held-out MLM-style probe or a small labeled set to detect collapse: if replaced-token accuracy is perfect and downstream F1 is flat, the generator is too weak or the domain is too repetitive (logs with a 20-token vocabulary of error codes). Mix in general text if the domain corpus is tiny so the encoder does not forget English.

## What you can borrow

- Supervise all positions with a discriminator when pretrain FLOPs are scarce.
- Keep the generator small; it is a noise source, not the product.
- Fine-tune the discriminator like BERT; do not expect generative MLM behavior.
- Bake off against MLM on your data before rewriting the pretrain stack.
- Stick with MLM if your team needs a single-objective, well-trodden path.
