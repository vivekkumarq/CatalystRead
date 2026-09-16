---
title: "T5: Every NLP Problem as Text-to-Text, With a Clean Encoder-Decoder"
slug: "t5-text-to-text-transfer-transformer"
description: "Raffel et al. cast translation, classification, and summarization as string-to-string tasks on a masked span-filling pretrained encoder-decoder. The framework still hiding behind a lot of seq2seq fine-tunes."
publishedAt: "2026-11-04"
category: "AI"
tags:
  - AI
  - NLP
  - Transformers
  - Research
sources:
  - title: "Exploring the Limits of Transfer Learning with a Unified Text-to-Text Transformer"
    author: "Colin Raffel et al."
    publisher: "Journal of Machine Learning Research, 2020"
    url: "https://arxiv.org/abs/1910.10683"
---

BERT classifies. GPT generates left to right. T5's bet is that *both* should look like seq2seq: prefix the input with a task name, generate the target as text. Raffel and colleagues pretrained an encoder-decoder by corrupting spans of C4 and generating the dropped spans, then fine-tuned the same stack on GLUE, translation, summarization, and QA by changing only the strings. The paper is a giant controlled study — architectures, objectives, data sets, scaling — not a single "T5 layer."

The engineering inheritance is the API. You do not add a classification head per task if you do not want to. You generate `"entailment"`. That is convenient and easy to mess up (the model emits `"entailment "` with a space, your exact-match eval fails). Normalization of outputs is part of the method in production.

## The ablation catalog is the gift

They compare causal LM, prefix LM, span corruption, model sizes, and more. If you only ship T5-base with default span corruption, you still benefit from the fact that someone already ran the expensive grid. When you invent a new objective in 2026, steal their discipline: one variable at a time, same compute where possible, C4 as a known mix.

Encoder-decoder vs decoder-only is a real serving fork. T5 must run an encoder over the full input then decode. For short classification that is fine. For long-context chat, decoder-only won the ecosystem. T5-family models (including Flan-T5) remained strong teachers and strong at explicit input/output transduction (translate this, extract that). Pick the interface, then the topology.

## C4 and "Colossal Clean"

The dataset paper inside the paper matters. Cleaning Common Crawl into C4 is a political and technical act (what you filter as "bad" text). Replications that skip cleaning or that over-clean minority dialects will not match. Document the filter.

## A worked text-to-text classifier

Input: `cola sentence: They her.` Target: `not_acceptable`. You constrain decoding to a two-word allowlist. Accuracy matches a BERT head, ops are heavier. You keep T5 because tomorrow the same checkpoint must also summarize. If it must never summarize, BERT is cheaper. Unified architecture is a tax you pay for unified ops and transfer.

## Failure modes

**Exact-match eval on un-normalized generations.**

**Span-corruption pretrain then expecting GPT-style chat** without instruction data.

**Task prefixes colliding** (`translate` vs `translation`) so fine-tunes do not transfer.

**Ignoring the encoder's max length** on documents you stuffed as text.


## Prefix collisions and multilingual T5

mT5 and later text-to-text models inherit the same API with a larger vocab and more languages. Prefix design still decides whether `summarize:` and `summarise:` are two tasks. Put prefixes in a registry. For classification, constrained decoding to the label set is cheaper than hoping the LM stays on vocabulary. T5's unified interface is an ops win only if you unified the evaluation too — exact match after normalization, not a different metric per internal team.

## What you can borrow

- Represent mixed tasks as prefixed strings into one seq2seq model when you want one training and serving path.
- Steal T5's ablation hygiene, not only the default objective.
- Constrain decoding for classification-as-generation.
- Use encoder-decoder when the input is a full document and the output is a transduction, not a long chat.
- Prefer an encoder-only or decoder-only specialist when you only have one of those jobs.
