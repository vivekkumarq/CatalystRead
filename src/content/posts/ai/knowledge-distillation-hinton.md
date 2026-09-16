---
title: "Knowledge Distillation: Train the Student on the Teacher's Soft Distribution"
slug: "knowledge-distillation-hinton"
description: "Hinton, Vinyals, and Dean taught small models to match a large model's temperature-smoothed probabilities. Why logits transfer more than hard labels, and how distillation still ships in 2026 stacks."
publishedAt: "2026-10-27"
category: "AI"
tags:
  - AI
  - Distillation
  - Efficiency
  - Research
sources:
  - title: "Distilling the Knowledge in a Neural Network"
    author: "Geoffrey Hinton, Oriol Vinyals, Jeff Dean"
    publisher: "arXiv 2015"
    url: "https://arxiv.org/abs/1503.02531"
---

A large model (or an ensemble) is accurate and expensive. A small model trained on one-hot labels misses the "this 3 looks a bit like a 5" structure in the teacher's outputs. Hinton, Vinyals, and Dean distill by matching the student's softmax to a *temperature-raised* teacher softmax, usually with a mix of that KL (or CE) term and a hard-label term. The temperature flattens the distribution so the dark knowledge in the tail is visible to the loss.

This is still how you ship on-device classifiers, compress ensembles, and, in the LLM era, train a 7B chat model from a 70B teacher (with a lot of extra machinery). The 2015 paper is the loss idea, not the whole alignment stack.

## Temperature is a focusing knob

At T=1, the teacher is often overconfident and the student only sees the argmax. At high T, you pay attention to the rest of the vocabulary or class set. At train time you scale logits by T; remember to use T² in the gradient weighting as they discuss if you mix with hard labels, or at least do not compare two papers that used different conventions. If distillation "does nothing," T is the first ablation.

The teacher does not have to be an ensemble of the same architecture. It has to emit a distribution on the same label space. Tokenizer mismatch in LLM distillation is the modern version of "not the same label space." Align vocabularies or distill on sequences the student can represent.

## What distillation cannot fix

If the teacher is wrong, the student learns fluent wrongness. If you need calibration, matching a peaked teacher can hurt. If you need a new skill the teacher does not have, distill after you add data, not instead. Distillation is compression and transfer of an existing behavior, not a pretraining law.

For sequences, token-level KL to a teacher (classic) versus sequence-level sampling (later RL/distill hybrids) behave differently. Start with the 2015 loss on classification heads; do not assume it is the only LLM distill.

## A worked mobile classifier

Teacher: 50M-parameter CNN, 92% on your app's 20 classes. Student: 3M. Hard labels alone: 86%. Distill at T=4 with a 0.7/0.3 mix of soft/hard: 90% and 3× faster on-device. You then distill from a teacher trained on a different class mapping and lose two classes. The method assumed a shared head.

## Failure modes

**Student capacity too low** to represent the teacher's decision boundary; loss looks busy, accuracy does not move.

**Teacher eval mode off** (dropout on) so the soft labels are noise.

**Temperature left at 1** with a nearly one-hot teacher.

**Reporting only training-set agreement with the teacher**, not the student's test accuracy.


## Distilling sequences in 2026

Token-level KL from a teacher LM is the direct descendant of the 2015 classification loss. It transfers style and local distribution but can also transfer teacher hallucinations. Mix in ground-truth sequences when you have them, or distill only on prompts where a verifier passed. Temperature still matters: too low and you clone argmax; too high and the student learns mush. For classifiers, stick to the original recipe. For LMs, treat Hinton et al. as the loss ancestor and add the verifiers the 2015 paper did not need.

## What you can borrow

- Match temperature-smoothed teacher probabilities when compressing a model that already works.
- Sweep T and the hard-label mix; they are the method.
- Keep teacher and student on the same output space (classes or tokenizer).
- Freeze the teacher in eval mode; you want its mean behavior.
- Do not distill as a substitute for data on tasks the teacher cannot do.
