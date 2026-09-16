---
title: "Chain-of-Thought: Make the Model Write the Intermediate Steps You Were Going to Need Anyway"
slug: "chain-of-thought-prompting"
description: "Wei et al. showed that a few worked solutions in the prompt, with explicit reasoning traces, lift large models on math and symbolic tasks. When CoT is load-bearing and when it is theater."
publishedAt: "2026-10-11"
category: "AI"
tags:
  - AI
  - Prompting
  - Language Models
  - Research
sources:
  - title: "Chain-of-Thought Prompting Elicits Reasoning in Large Language Models"
    author: "Jason Wei et al."
    publisher: "NeurIPS 2022"
    url: "https://arxiv.org/abs/2201.11903"
---

Few-shot prompting with direct answers hits a wall on multi-step arithmetic and symbolic puzzles. Wei and colleagues put the *work* in the demonstrations: not only the final number, but a natural-language trace of the steps. On large enough models, that prompt style jumped accuracy on GSM8K-style math and similar tasks compared with answer-only exemplars. Smaller models often did not get the same lift. The paper is a scaling-plus-prompt result, not a guarantee that "let's think step by step" saves a 1B parameter chatbot.

The engineering reading is unromantic. You were going to need those intermediate checks in the product anyway (units, intermediate totals, tool results). CoT is a way to get the model to emit them in the same string you already send to a parser. It is not a proof system.

## Why size showed up in the plots

The authors emphasize that CoT becomes useful when the model is already competent enough to imitate a reasoning *format* and to do local steps correctly. A small model will emit a convincing trace that ends in the wrong number. If your eval only reads the last integer, you will ship fluent wrongness. If your eval reads the trace, you will see the local arithmetic is already garbage and prompting will not save you.

The traces in the paper are human-written few-shot examples. Later "zero-shot CoT" ("think step by step") is a cousin, not the same experiment. Few-shot CoT also consumes a lot of context. Four long solutions can crowd out the test question. Compress the traces to the steps that actually branch.

## Faithfulness is not included

A correct final answer can sit under an inconsistent trace, and a pretty trace can hide a guess. Do not use CoT text as an audit log for regulators unless you have a verifier (code interpreter, unit checks, retrieval citations) that does not trust the prose. The paper's claim is empirical accuracy on benchmarks, not interpretability.

Self-consistency (sample multiple traces, vote) is a later add-on that often helps and multiplies cost. Treat it as a product knob with a latency budget, not as part of the 2022 method.

## A worked GSM-style product

Invoice line items, tax rules, a total. Direct prompting fails when there are five lines. CoT prompting with one worked invoice in the prompt, then a regex on "Total:". You still run a deterministic summer on the parsed lines and ignore the model's total when they disagree. The trace is for debugging and for the model's own intermediate scratchpad. The verifier is the system of record. That hybrid is how you borrow the paper without buying the hallucination.

## Failure modes

**CoT on classification tasks that do not need it**, paying tokens for a paragraph that does not change the label.

**Leaking the answer format** so the model copies "the answer is 42" from a demo with a different question.

**Evaluating only exact match on the final number** while traces are nonsense.

**Assuming CoT reduces jailbreaks.** Extra reasoning tokens can also help the model talk itself into a bad action.

## What you can borrow

- Put worked traces in the prompt when the task is genuinely multi-step and the model is large enough to imitate the format.
- Parse and verify intermediates; do not treat the chain as an audit log.
- Budget tokens: short traces that match the real branching, not essays.
- Measure small models separately; CoT is not a substitute for capacity.
- Skip CoT when a tool or a spreadsheet can do the steps exactly.
