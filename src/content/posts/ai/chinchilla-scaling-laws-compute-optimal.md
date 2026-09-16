---
title: "Chinchilla: Compute-Optimal Training Means More Tokens, Not Only More Parameters"
slug: "chinchilla-scaling-laws-compute-optimal"
description: "Hoffmann et al. showed Kaplan-style laws overemphasized parameters. For a fixed FLOP budget, smaller models trained on more tokens win. How to use the 20-token rule without cargo-culting 2022 hardware."
publishedAt: "2026-10-17"
category: "AI"
tags:
  - AI
  - Scaling
  - Language Models
  - Research
sources:
  - title: "Training Compute-Optimal Large Language Models"
    author: "Jordan Hoffmann et al."
    publisher: "arXiv 2022"
    url: "https://arxiv.org/abs/2203.15556"
---

Kaplan et al. gave the industry a mental model: bigger models are better, and you can stop training early relative to the model's size. Hoffmann and colleagues retrained a large set of models under a *fixed compute* budget and asked a different question: given FLOPs, how should you split parameters and tokens? Their fit said contemporary large models were undertrained. The compute-optimal point they popularized was on the order of 20 tokens per parameter (the Chinchilla 70B model trained on 1.4T tokens), and that smaller, longer-trained model beat a much larger, shorter-trained Gopher-like baseline on many evals.

If you are planning a pretrain, this paper is the budget meeting. Parameters are not free at inference either: a 70B model that is compute-optimal to train can be cheaper to serve than a 280B model that never saw enough data.

## Three approaches, one conclusion

They estimate the compute-optimal frontier with three analysis styles (including IsoFLOP curves: vary size, fix FLOPs, read the loss). The agreement among those approaches is the confidence. A single power law fit on a messy scatter is not. If you only remember "20 tokens per parameter," remember it is a 2022 fit for their architecture, tokenizer, and data. Later Llama runs used far more tokens than Chinchilla-optimal because *inference* cost and a fixed serving size change the objective. Training-optimal is not serving-optimal.

Overtraining a 7B on many tokens can be rational if you will serve 7B a billion times. Chinchilla did not forbid that. It forbade pretending a 500B model trained on too few tokens is "the scaled one."

## Data quality still sits outside the law

Scaling laws assume additional tokens look like previous tokens. Repeat detection, contamination, and synthetic sludge change the curve. Hoffmann et al. are not a license to scrape until the FLOP budget fills. If loss falls while your private eval is flat, you are optimizing the pretrain distribution, not the product.

Optimizer, batch size, and learning-rate schedule are part of "compute." A mis-tuned 70B is not a Chinchilla replica. The paper's runs were careful; your one-off run might not be.

## A worked FLOP split

You have a budget that can train either 30B for T tokens or 7B for roughly four times T (order-of-magnitude, architecture-dependent). Chinchilla says to check which lands closer to the frontier, then to remember you must serve the winner. If the 7B overtrained model wins your app eval and fits a single GPU, you have the 2022 lesson plus a 2026 serving constraint. If you already committed to a 70B serving contract, dump extra tokens into 70B rather than growing to 140B you cannot host.

## Failure modes

**Using Kaplan exponents to size a 2026 run.**

**Treating 20× as a moral law** after you change tokenizer, MoE, or data repeats.

**Ignoring inference:** training-optimal models can still be too big to deploy.

**Comparing Chinchilla 70B to a chat-tuned 70B** as if the paper measured instruction following.

## What you can borrow

- For a fixed training FLOP budget, jointly choose size and token count; do not only grow depth.
- Re-fit or at least re-validate the tokens-per-parameter ratio on your stack; the number is a prior, not a constant.
- Separate train-optimal from serve-optimal; overtrain small models when serving dominates.
- Keep data quality in the loop; extra tokens of sludge are not Chinchilla tokens.
- Do not cite the paper to justify a giant undertrained model because "Kaplan said parameters."
