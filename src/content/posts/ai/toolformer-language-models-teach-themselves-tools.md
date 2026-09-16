---
title: "Toolformer: Self-Supervised Practice at Inserting API Calls into Text"
slug: "toolformer-language-models-teach-themselves-tools"
description: "Schick et al. let a language model decide where API calls would help, executed the calls, and fine-tuned on the traces that actually lowered loss. A recipe for teaching tools without full RL."
publishedAt: "2026-10-13"
category: "AI"
tags:
  - AI
  - Tool Use
  - Language Models
  - Research
sources:
  - title: "Toolformer: Language Models Can Teach Themselves to Use Tools"
    author: "Timo Schick et al."
    publisher: "arXiv 2023"
    url: "https://arxiv.org/abs/2302.04761"
---

Prompting a model to use a calculator works until the model forgets to call it. Toolformer builds a training set in which tool use is just another kind of token. Schick and colleagues start with a frozen LM, sample candidate positions and API calls (calculator, calendar, QA, translation, Wikipedia), execute those calls, and keep the insertions that improve the model's ability to predict the rest of the text. They then fine-tune on the filtered traces. The model learns *when* to emit a call because that behavior was selected by a loss criterion, not by a human writing "always search."

This is closer to self-supervised data construction than to ReAct-style prompting. You need sandboxed tools, a sampling budget, and a filter that does not keep calls that merely copy the answer from the tool into a sentence the model already knew.

## The filter is the method

Naive insertion of API results into every sentence would train a model to stall on tools. They keep a call only when it reduces perplexity on the continuation relative to not calling. That is a simple, ruthless product idea: if the tool did not help the next tokens, it was not supervision. When you build an internal Toolformer, the metric should be the same flavor — did the call change downstream correctness — not "we emitted 10k traces."

The paper's tools are small and typed. A calculator returns a number. That boundedness makes filtering tractable. If your tool is "run arbitrary SQL on production," you do not have Toolformer, you have an incident. Constrain outputs. Cache. Rate-limit.

## Sampling candidates is compute

You pay inference to propose calls and more inference to score keep-or-drop. That is fine for a one-time dataset. It is not a per-request algorithm. The deployed model is just an LM that sometimes emits a special call syntax, which a host executes, then continues. Host-side execution is non-negotiable, the same as any tool-calling system.

Few tools beat a kitchen sink. Each tool needs a prompt or a template for how the LM should format the call. Ambiguous formats kill the parser. The paper is small-scale by 2026 standards; the idea scales as data generation, not as adding fifty undifferentiated APIs.

## A worked calculator path

You sample sentences with numbers from a corpus, insert `[Calculator(3/4)]` candidates, keep those that help the model predict a later percentage. Fine-tune. At inference, the host intercepts the calculator span, returns `0.75`, and the model continues. If you skip the host and let the model "imagine" the calculator, you undid the paper. If you keep every candidate without a loss filter, you train hesitation.

## Failure modes

**Tools with side effects** in the data-generation loop.

**Keeping traces where the tool output is concatenated but the model never needed it**, teaching cargo-cult calls.

**Call syntax that collides with natural text.** Use unlikely sentinels and test the parser on your corpus.

**Evaluating tool-use rate instead of task accuracy.**

## What you can borrow

- Generate tool-use supervision by keeping only calls that improve a measurable next-token or task score.
- Execute tools in the host during both dataset build and serving.
- Start with a few typed tools whose outputs are short and checkable.
- Treat candidate sampling as an offline compute job, not a runtime loop.
- Do not Toolformer your way around a missing deterministic service: if the answer is always in a table, query the table.
