---
title: "DDPM: Diffusion as Denoising Score Matching You Can Sample"
slug: "denoising-diffusion-probabilistic-models"
description: "Ho, Jain, and Abbeel trained a noise-conditional denoiser and sampled by reversing a Gaussian chain. The training objective that still sits under a lot of modern image generators."
publishedAt: "2026-10-09"
category: "AI"
tags:
  - AI
  - Generative Models
  - Diffusion
  - Research
sources:
  - title: "Denoising Diffusion Probabilistic Models"
    author: "Jonathan Ho, Ajay Jain, Pieter Abbeel"
    publisher: "NeurIPS 2020"
    url: "https://arxiv.org/abs/2006.11239"
---

GANs generate in one forward pass and fight a discriminator. Autoregressive image models generate pixel by pixel. Denoising diffusion probabilistic models (DDPMs) add Gaussian noise in a fixed forward Markov chain until the image is nearly isotropic noise, then train a neural net to predict the noise (or a related target) at each step so you can run the chain backwards. Ho, Jain, and Abbeel showed that a simplified mean-squared error objective on that noise prediction was enough to get image samples that competed with GANs on CIFAR and CelebA-HQ, with a likelihood story attached.

The engineering takeaway is the split: a dumb, fixed corruption process and a learned denoiser. You do not train a discriminator. You do train many network evaluations at sample time. That trade — stable training, slow sampling — is the one later latent diffusion, distillation, and better solvers keep renegotiating.

## The loss that people actually implement

The variational bound on the reverse process is ugly. The paper's simplified training loss is not: pick a timestep `t` uniformly, add the corresponding noise to `x0`, predict that noise with a U-Net, and take MSE. The network is conditioned on `t` (embeddings, not a mystery). If you omit timestep conditioning, you are asking one set of weights to denoise every noise level, and it will fail in a boring way.

The reverse step uses the noise prediction to estimate the previous latent. Small errors compound across hundreds of steps. That is why sampler choice (DDPM ancestral, DDIM, later higher-order ODE solvers) became its own literature. The trained denoiser and the sampler are coupled but not identical pieces of software. Swap the sampler without eval and you will "improve speed" into artifacts.

## Why U-Nets showed up here

The backbone is a U-Net with residual blocks and self-attention at coarse resolutions. Skip connections help the network copy high-frequency structure that should survive a light noise level. If you drop the U-Net for a tiny MLP "to see the idea," you will see the idea and no images. Parameterize like an image-to-image model, because that is what denoising is.

## A worked training loop (conceptual)

Image batch, sample `t`, sample epsilon, form `x_t`, predict epsilon, MSE, Adam. EMA of weights for sampling. At sample time, start from Gaussian noise and step `t` from T to 1. The first time you implement this, the bug is usually off-by-one in the noise schedule or forgetting to scale the image to the range the schedule assumes. The second bug is evaluating FID on 50 images and declaring a winner.

## Failure modes

**Too few steps at sample time** with an ancestral sampler that was tuned for T=1000.

**Learning-rate and EMA mistakes** that make training loss look healthy while samples are noise.

**Mode coverage vs fidelity.** Diffusion is better-behaved than GANs on collapse, but a weak backbone still blurs.

**Treating the simplified loss as a likelihood.** If you need bits per dim, use the actual bound they also discuss.

## What you can borrow

- Separate a fixed forward corruption from a learned reverse denoiser when GAN training is too unstable for your team.
- Condition the network explicitly on noise level.
- Treat the sampler as a product knob with its own eval, not as "the architecture."
- Use EMA weights for samples; raw training weights often look worse.
- Do not use hundreds of denoising steps in a user-facing loop without distillation or a faster solver.
