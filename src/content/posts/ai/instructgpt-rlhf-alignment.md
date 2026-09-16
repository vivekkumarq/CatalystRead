---
title: "InstructGPT: Alignment as a Training Pipeline, Not a Prompt Preface"
slug: "instructgpt-rlhf-alignment"
description: "Ouyang et al. turned human preference data into a reward model and PPO updates so a smaller GPT-3 followed instructions better than a larger base model. The pipeline, the costs, and the failure modes still show up in every RLHF stack."
publishedAt: "2026-10-02"
category: "AI"
tags:
  - AI
  - Alignment
  - RLHF
  - Research
sources:
  - title: "Training language models to follow instructions with human feedback"
    author: "Long Ouyang et al."
    publisher: "NeurIPS 2022"
    url: "https://arxiv.org/abs/2203.02155"
---

Base GPT-3 was a completion engine. If you asked it a question, it might continue in the style of a web page that *contained* a question. InstructGPT is the paper that made "follow the user's instruction" a trained behavior instead of a prompt hack. Ouyang and colleagues collected demonstration data from labelers, trained a supervised policy, then trained a reward model on comparisons between model outputs, then optimized that policy with PPO against the reward model while staying close to the supervised checkpoint with a KL penalty.

The headline number that moved the industry: labelers preferred a 1.3B InstructGPT model over a 175B GPT-3 on a held-out prompt distribution. Scale was not a substitute for the right objective. If you are still arguing that a bigger base model will "just listen," this paper is the counterexample you should have already internalized.

## Three stages, three different bugs

Supervised fine-tuning (SFT) on demonstrations is the part everyone can run. It teaches format, tone, and the idea that the assistant should answer rather than riff. It also clones labeler quirks and under-explores. The reward model (RM) is where you learn a scalar for "better response." Pairwise comparisons were easier for humans than absolute scores, and that design choice is still the default. PPO is where you sample from the policy, score with the RM, and update. The KL term is not decoration: without it the policy hacks the reward model with gibberish that happens to score well.

If your stack skips the RM and PPO and ships SFT only, you have instruction following in the narrow sense and you do not have the paper's method. That can still be the right product call. It is a different system.

## What human feedback actually is

The labelers were contractors with a written spec, not "humanity." The paper is explicit that the model is aligned to that spec and those people. Toxicity and truthfulness moved in the direction the spec asked for; they did not become solved. If your company copies the pipeline and changes the spec, you should expect the model to move with the spec, including the parts you did not intend.

Comparison data is expensive and gets stale as the policy changes. A reward model trained on outputs from last quarter's policy will be asked to rank samples from a stronger, weirder policy. That distribution shift is why labs keep collecting comparisons. If you freeze the RM and keep PPO-ing, you are training against a ghost.

## A worked preference loop

You have a support-bot policy. SFT on 2k rewritten answers that match the house style. You sample two replies per ticket, ask agents which is better, train an RM, run a short PPO job with a KL budget you actually plot. The first failure you will see is length bias: longer answers win comparisons, so the policy becomes verbose. You add a length penalty or instruct labelers to punish padding. That is InstructGPT's world: the objective you wrote is not the objective the data implied.

## Failure modes

**Reward hacking.** Fluent, confident, empty answers that the RM likes. Read samples, not only reward curves.

**Over-refusal after a safety pass.** The paper already shows alignment can reduce performance on some public NLP suites. If you only watch "harmlessness" you will ship a model that will not answer support questions.

**PPO instability blamed on GPUs.** Check KL, reward variance, and whether the SFT reference is the model you think it is.

**Calling any chat fine-tune "RLHF."** If there is no reward model and no RL step, say SFT.

## What you can borrow

- Put the instruction-following objective in the training pipeline, not only in a system prompt.
- Keep a KL tether to a reference policy; unconstrained reward maximization is how you get nonsense.
- Treat labeler specs as product requirements: write them, version them, audit disagreements.
- Prefer pairwise comparisons when absolute scoring is noisy.
- Plot length, refusal rate, and task accuracy together so one metric cannot eat the others.
