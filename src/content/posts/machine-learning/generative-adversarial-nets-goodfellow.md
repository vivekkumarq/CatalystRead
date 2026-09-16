---
title: "GANs: Adversarial Training as a Two-Player Game, and Why It Is Still Hard"
slug: "generative-adversarial-nets-goodfellow"
description: "Goodfellow et al. trained a generator against a discriminator so samples would match the data distribution. Mode collapse, unstable losses, and when diffusion replaced the GAN default."
publishedAt: "2026-11-11"
category: "Machine Learning"
tags:
  - Machine Learning
  - Generative Models
  - Deep Learning
  - Research
sources:
  - title: "Generative Adversarial Nets"
    author: "Ian J. Goodfellow et al."
    publisher: "NeurIPS 2014"
    url: "https://arxiv.org/abs/1406.2661"
---

Maximum-likelihood density models can be intractable; explicit pixel likelihoods can be blunt. Generative Adversarial Nets set up two networks: a generator `G(z)` that maps noise to samples, and a discriminator `D(x)` that scores real versus fake. Goodfellow and colleagues train them in a minimax game so `G`'s samples become hard for `D` to distinguish from data. The 2014 paper is short, influential, and the start of a decade of stabilization tricks (DCGAN, WGAN, spectral norm, StyleGAN).

The engineering truth: the loss you plot is not a monotone quality metric. A low generator loss can mean the discriminator died. FID and human eval exist because the game is not a cross-entropy classifier on a fixed dataset.

## Why training fights you

If `D` is too strong, gradients to `G` vanish. If `D` is too weak, `G` gets noise. Mode collapse: `G` produces a few plausible modes that fool `D` and ignores the rest of the data. The original value function and the saturating/non-saturating variants behave differently in the tails. If you implement the first equation in the paper and not the practical generator loss they also discuss, you will reproduce 2014 pain.

GANs do not give you a likelihood. You cannot easily rank "how real is this sample" with `p(x)` unless you bolt something on. For anomaly detection people still try `D(x)` and then suffer. Use a method that matches the product.

## Where GANs remain reasonable

Fast one-step generation (style transfer, some super-resolution, some speech vocoders historically) still likes a GAN term. Diffusion plus an adversarial decoder (latent diffusion's VAE) is a descendant, not a contradiction. If you need a full image distribution from noise in 2026, you will probably start from a diffusion or flow model unless latency forbids it. Cite Goodfellow for the *game*, not as the default image sampler.

## A worked collapse

CelebA faces, DCGAN-ish. After 10k steps, only two faces. Discriminator accuracy 50% because both "real" and "fake" look like those two. You add a diversity term, lower `G` LR, minibatch discrimination (later papers). Or you switch to a VAE or DDPM because you needed coverage more than sharp teeth. That decision is allowed.

## Failure modes

**Reporting D loss as quality.**

**Unmatched architectures** (a 3-layer G vs a 20-layer D).

**Evaluating on training images** the GAN memorized.

**Using vanilla GAN loss on 256px ImageNet** without the last ten years of tricks and calling GANs "debunked."


## Metrics that survived the GAN decade

Inception Score rewarded sharp, classifiable images and could be gamed. FID is better and still not a user study. For a product, A/B on the actual artifact (does the upscaler help OCR? does the face swap get flagged?). Keep a small human panel. The 2014 minimax math does not pick your metric. If you add a GAN loss to a diffusion decoder, log both reconstruction and the adversarial term, and look at samples weekly. GANs teach you not to trust the training curve. That lesson outlived DCGAN.

## What you can borrow

- When likelihood is intractable, a learned critic can supply a training signal for a generator.
- Monitor samples and distribution coverage, not only the game losses.
- Keep G and D in a similar power band; retune LRs independently.
- Use GAN losses as an extra term when you already have a reconstruction or diffusion backbone.
- Prefer more stable generative families when you need coverage and a likelihood-like eval.
