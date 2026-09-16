---
title: "Constitutional AI: Harmlessness From Critiques, Not Only From Human Labels"
slug: "constitutional-ai-harmlessness-from-ai-feedback"
description: "Bai et al. use a written constitution and AI critiques to train a harmless assistant with far less human red-teaming per update. What the constitution actually is, and where RLAIF still hides human choices."
publishedAt: "2026-10-14"
category: "AI"
tags:
  - AI
  - Alignment
  - Safety
  - Research
sources:
  - title: "Constitutional AI: Harmlessness from AI Feedback"
    author: "Yuntao Bai et al."
    publisher: "Anthropic, 2022"
    url: "https://arxiv.org/abs/2212.08073"
---

RLHF for harmlessness needs humans to compare unsafe and safe replies at scale. Constitutional AI (CAI) tries to spend those humans on writing principles instead of ranking every pair. Bai and colleagues describe two stages. First, a supervised stage: the model produces a response, then critiques it against a constitution (a list of rules and values), then revises. Those revisions become SFT data. Second, they train a preference model using AI-generated comparisons guided by the same constitution, then RL (or equivalent) against that model — RLAIF rather than only RLHF.

The honest reading: humans did not leave the loop. They left the *per-sample* loop. The constitution, the critique prompts, the choice of which principles apply, and the eval suite are all human products. If you copy CAI and paste a vague "be helpful and harmless," you will get a vague model.

## A constitution is a requirements document

Good principles are testable: "do not provide operational assistance for violent crime" is closer to a spec than "be good." Conflicts are normal (helpfulness vs harmlessness). The paper's pipeline surfaces those conflicts in critiques. Your job is to order principles and to write tie-breakers. Legal and policy teams should read the constitution the way they read a ToS, because that is what you are training.

Critique-and-revise can wash out useful answers into refusal. That is not a bug in the optimizer; it is the constitution winning. Measure over-refusal on a benign set the same week you measure jailbreak rates. InstructGPT already warned that alignment moves multiple metrics. CAI is the same shape with a different label source.

## AI feedback inherits model failures

If the critic cannot see a clever jailbreak, the preference model will not punish it. If the critic is sycophantic, revisions will be polite and still wrong. Human red teams remain for the tail. CAI is a force multiplier for the body of the distribution, not a replacement for adversarial eval.

The RL stage has the usual reward-hacking story. A model can learn to cite the constitution in-prose while still leaking. Read samples. "I must follow principle 4" is not safety.

## A worked internal constitution

A support bot: principles for PII, medical advice, and competitor bashing. Critique prompt lists those three only. Revise. Humans spot-check 200 pairs a week instead of labeling 20k. You still run a frozen jailbreak set. When a new scam pattern appears, you add a principle and regenerate a slice of data rather than waiting for a full human preference campaign. That operational loop is the reason to steal CAI.

## Failure modes

**Principles that overlap and contradict** with no priority.

**Critic and policy being the same checkpoint** without any diversity, so blind spots clone.

**No over-refusal eval.**

**Shipping the critique transcripts to users** as if they were guarantees.


## Versioning the text that trains the model

A constitution that lives in a slide deck will drift from the one in the training repo. Keep it in git, review it like an API, and stamp the hash into the model card. When legal changes a definition of "medical advice," regenerate the affected critique slice and record which policy version the live model was trained against. That is the only way an incident review can answer "which rules was it following?" without archaeology. If you cannot point to a commit, you do not have Constitutional AI; you have a vibe.

## What you can borrow

- Spend scarce humans on writing and versioning principles; use models to expand critique/revision data.
- Treat the constitution as shipped policy: review, version, test.
- Pair harmlessness gains with an over-refusal dashboard.
- Keep a human adversarial set for the tail the critic cannot see.
- Do not call a single safety system prompt "Constitutional AI."
