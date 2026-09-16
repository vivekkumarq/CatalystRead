---
title: "Adam: Adaptive Moments That Became the Default Optimizer — With the Caveats Intact"
slug: "adam-optimizer-kingma-ba"
description: "Kingma and Ba combined RMSProp-style second moments with momentum and a bias correction. Why Adam trains transformers, and when the paper's own advice still says to try SGD."
publishedAt: "2026-11-08"
category: "Machine Learning"
tags:
  - Machine Learning
  - Optimization
  - Deep Learning
  - Research
sources:
  - title: "Adam: A Method for Stochastic Optimization"
    author: "Diederik P. Kingma, Jimmy Ba"
    publisher: "ICLR 2015"
    url: "https://arxiv.org/abs/1412.6980"
---

SGD with a global learning rate treats every parameter the same. Adam keeps an exponential moving average of the gradient (first moment) and of the squared gradient (second moment), then steps in the direction of the first divided by the sqrt of the second, plus epsilon. Kingma and Ba also added bias correction because those moving averages start at zero and would otherwise be too small in early steps. The algorithm became the default for language models, GANs of a certain era, and most "I just want it to train" notebooks.

The paper is an optimizer, not a guarantee of the best test accuracy. Several later works (including AdamW) exist because Adam's implicit regularization is not the same as SGD's, and because L2 weight decay was often implemented wrong with adaptive methods.

## What the hyperparameters actually do

`beta1` (often 0.9) is momentum-ish. `beta2` (often 0.999) is how long the second-moment memory lasts. A too-large `beta2` on non-stationary noise can keep a stale scale. `eps` prevents divide-by-zero and also sets a floor on adaptivity; extremely small eps can be unstable in fp16. The default LR of 0.001 is a classification-CNN era guess. Transformers often use 1e-4 or a warmup-to-peak schedule. Copying 0.001 into a 7B pretrain is how you get NaNs and then blame mixed precision.

Bias correction is not optional in the original. Some frameworks expose `adam` vs `adam` without correction. Match the paper if you are reproducing, match the framework's well-tested default if you are shipping.

## When SGD still wins

Image classification with a well-tuned cosine SGD plus momentum can generalize better than Adam on some classic CNNs. If you have the budget to tune SGD, do not treat Adam as theoretically superior. If you have a transformer, a weekend, and a noisy loss, Adam (or AdamW) is the rational default. The paper's experiments are small by modern standards; the algorithm scaled anyway.

Sparse gradients (NLP embeddings, recommenders) were part of Adam's motivation versus plain SGD. Adagrad-style accumulators never forget; Adam's exponential second moment forgets. That is why it can keep moving late in training on features that became rare.

## A worked divergence

Loss explodes at step 200. LR is 1e-3, beta2 0.999, fp16, no warmup. You add warmup, drop LR, raise eps, switch to AdamW. If it still explodes, the bug is the net (init, residual scale), not Adam's Wikipedia pseudocode. Optimizers get blamed for architecture fires.

## Failure modes

**Weight decay implemented as L2 on the Adam update** (see AdamW).

**No warmup on large-batch transformers.**

**Comparing Adam 3 epochs to SGD 90 epochs** and declaring a winner.

**eps so large** that the second moment does nothing and you have signed SGD with extra RAM.


## Memory and fused implementations

Adam stores two extra tensors per parameter. That is why ZeRO exists. Fused Adam kernels cut bandwidth on the update but must still implement bias correction and eps the way you think they do. When you switch from a textbook loop to `fused=True`, run a few steps of a tiny net and compare. Also remember that sparse embedding bags sometimes use a sparse Adam variant; mixing dense Adam on embeddings can densify the update and blow memory. Read which parameter groups use which optimizer.

## What you can borrow

- Use per-parameter adaptive steps with bias-corrected moments when the loss is noisy and the model is heterogeneous.
- Treat 0.001 / 0.9 / 0.999 as a starting point, not a law; retune LR and warmup for scale.
- Keep eps visible in mixed precision.
- Try SGD+momentum when a mature CV recipe already exists.
- Do not implement "Adam + L2" without reading Loshchilov and Hutter.
