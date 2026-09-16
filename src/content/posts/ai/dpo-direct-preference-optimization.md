---
title: "DPO: Preference Tuning Without a Separate Reward Model and PPO Loop"
slug: "dpo-direct-preference-optimization"
description: "Rafailov et al. showed you can fit the RLHF objective by classifying preferred vs rejected completions under a closed-form policy. Why teams adopted it, and when the missing reward model still matters."
publishedAt: "2026-10-03"
category: "AI"
tags:
  - AI
  - Alignment
  - Fine-tuning
  - Research
sources:
  - title: "Direct Preference Optimization: Your Language Model is Secretly a Reward Model"
    author: "Rafael Rafailov, Archit Sharma, Eric Mitchell, Stefano Ermon, Christopher D. Manning, Chelsea Finn"
    publisher: "NeurIPS 2023"
    url: "https://arxiv.org/abs/2305.18290"
---

RLHF as InstructGPT described it is a three-piece machine: a supervised policy, a reward model, and an on-policy RL optimizer. Direct Preference Optimization (DPO) asks whether you need the middle two as separate jobs. The authors start from the same KL-constrained reward maximization that PPO implements, derive the optimal policy in terms of the reward, invert it, and obtain a loss you can run as supervised learning on pairs of preferred and rejected completions.

The practical pitch is brutal in a good way. You keep a frozen reference model (usually the SFT checkpoint), you take preference pairs, and you increase the likelihood of the winner relative to the loser, scaled by a beta that plays the role of the KL temperature. No sampling during the RL phase, no critic, no PPO hyperparameters. For a lot of labs that is the difference between "we will try alignment next quarter" and "we shipped a preference tune this week."

## What the math is doing in English

If the optimal policy under a KL constraint is a softmax over rewards relative to the reference, then the reward of a completion is a log-ratio of policy to reference, plus a partition term that cancels in a pairwise comparison. The DPO loss is therefore a binary classification on that log-ratio gap. When the winner is already much more likely than the loser under the current policy, the gradient goes quiet. When the model prefers the rejected sample, you get a strong push.

Beta is the knob people treat as a learning rate's cousin. Small beta lets the policy move farther from the reference; large beta keeps it conservative. If you copy a beta from a 7B recipe into a 70B run without looking at the implicit reward margin, you will either underfit the preferences or wreck the SFT model's fluency.

## Off-policy pairs are the hidden assumption

DPO does not require on-policy samples in the algorithm, which is why it is cheap. It also means the pairs you train on may come from an older policy, a different model, or humans writing both sides. That can work. It can also teach the model to reject styles that the current policy never produces, or to chase artifacts in synthetic losers. If your rejected samples are all obviously bad, DPO becomes a weak "don't be that dummy" classifier and you will wonder why win rates stall.

PPO still exists because sampling from the live policy finds new failure modes the static pair set never contained. DPO plus a later round of fresh pairs is often the grown-up version of "we replaced RLHF."

## A worked pair set

You SFT a coder model. You collect 10k pairs: a correct unit-tested patch versus a plausible patch that fails tests. You run DPO with the SFT model as reference. Offline win rate on a held-out pair set looks great. Online, the model starts refusing to write code that looks like the rejected style even when that style is a valid API. You inspect the losers and find they were all "too verbose." The model learned brevity, not correctness. Preference data without a task oracle will optimize the dimension annotators actually used.

## Failure modes

**Reference mismatch.** Using a different tokenizer, chat template, or base checkpoint than the one that produced the SFT logits. The log-ratios become junk.

**Beta and LR both large.** The policy collapses toward saying the preferred phrase on every prompt.

**No SFT stage.** DPO on a raw base model can fight completion priors instead of instruction priors.

**Evaluating only on the training pair domain.** You need a generation eval, not only pairwise accuracy of the loss.

## What you can borrow

- Use DPO when you have preference pairs and you want a closed-form alternative to PPO, not when you have no reference policy.
- Keep beta, KL-to-reference, and a generation eval on the same dashboard.
- Refresh rejected samples as the policy improves; a static dummy set saturates.
- Inspect what annotators actually preferred (length, tone, hedging) before you trust a win rate.
- Reach for on-policy RL when the failure modes are not in the offline set.
