---
title: "GPT-3: When Scale Made Few-Shot Prompting a Product Surface"
slug: "gpt3-few-shot-learners-paper"
description: "Brown et al. showed that a 175B decoder, prompted with a handful of examples, could do tasks no one fine-tuned it for. What that changed for APIs, eval, and when prompting is the wrong tool."
publishedAt: "2026-10-01"
category: "AI"
tags:
  - AI
  - Language Models
  - Research
  - Prompting
sources:
  - title: "Language Models are Few-Shot Learners"
    author: "Tom B. Brown et al."
    publisher: "NeurIPS 2020"
    url: "https://arxiv.org/abs/2005.14165"
---

Before GPT-3, the default path into a new NLP task was a labeled dataset and a fine-tune. Brown and colleagues trained a 175-billion-parameter decoder on a filtered Common Crawl mix and then refused, for a large slice of the paper, to update those weights. They stuffed a task description and a few input/output pairs into the context window and asked the model to continue. On many benchmarks the few-shot numbers were not state of the art, but they were good enough to change the product question from "how do we collect 50k labels?" to "what fits in the prompt?"

That is the engineering claim worth keeping. Scaling the model and the data made in-context learning a usable interface, not a curiosity on a 1.5B checkpoint. The API era of language models is a direct descendant of that interface: you ship a string, not a training job.

## Zero, one, and few shot are not three models

The paper is careful about the protocol. Zero-shot is an instruction and a test input. One-shot adds a single demonstration. Few-shot adds several. The same frozen weights serve all three. Performance usually rose with more examples, but the curve was noisy and task-dependent. If you treat "few-shot" as a magic prefix in a vendor dashboard, you will miss the actual lever: which examples, in which order, with which separator tokens.

Context length was already the budget. GPT-3's window was large for 2020 and small for 2026. Every demonstration you add is a token you cannot spend on the user's document. Teams that paste twenty messy tickets into the prompt are not "doing few-shot"; they are burning the window and hoping recency bias picks the right pattern.

## What the paper measured versus what products need

The evaluation diet is SuperGLUE-style tasks, translation, closed-book QA, arithmetic, and news-article generation. The generation samples are the part that aged into a product warning: fluency is not factuality, and likelihood is not a citation. The authors already discussed data contamination and the risk that a web-scale train set has seen the test set. If your 2026 eval set lives on GitHub, assume the model family has had a chance to memorize the shape of it.

Few-shot classification in a production classifier is still a trade. You skip a training pipeline and you inherit prompt brittleness, cost per token, and a refusal to give you calibrated probabilities without extra work. Fine-tuning (or a small specialist model) remains cheaper when the task is stable and the label schema is known.

## A worked prompt budget

A support-intent tagger with 12 labels. Zero-shot: a label list and one ticket. Few-shot: two examples per label is 24 demonstrations, which may already exceed a tight window once the ticket is long. You instead pick one hard example per confused pair of labels, freeze the prompt, and log when the model emits an out-of-schema string. That log is your dataset for a later fine-tune. The paper's contribution is the existence of that first frozen baseline, not a mandate to stay frozen forever.

## Failure modes

**Demo order as an untested hyperparameter.** Shuffle the few-shot block and watch accuracy move. If you did not measure that, you do not have an eval, you have a lucky paste.

**Instructions that contradict the demonstrations.** The model will often follow the nearest examples. Write one contract and stick to it.

**Using generation benchmarks as a safety story.** The paper is an existence proof for in-context learning, not a harmlessness paper.

**Treating 175B as the lesson.** The lesson is the scaling trend plus the prompting interface. Distilled and later instruction-tuned models changed the zero-shot story again.

## What you can borrow

- Freeze a strong model and treat the prompt as the first product surface when labels are expensive and the task is still moving.
- Budget demonstrations like you budget memory: each example competes with the user's input.
- Log schema failures from few-shot outputs; that log is the cheapest path to a later specialist model.
- Assume contamination on public evals; hold out private tasks if the number is a ship gate.
- Do not use few-shot prompting as a classifier when you already have 100k clean labels and a latency budget in the tens of milliseconds.
