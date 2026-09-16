---
title: "LSTM: Gated Memory So Gradients Can Survive Long Sequences"
slug: "lstm-long-short-term-memory"
description: "Hochreiter and Schmidhuber introduced constant-error carousels and multiplicative gates so recurrent nets could learn lags far beyond vanilla RNN horizons. What still applies after transformers, and how to not implement a broken gate."
publishedAt: "2026-11-23"
category: "Machine Learning"
tags:
  - Machine Learning
  - Sequence Models
  - Deep Learning
  - Research
sources:
  - title: "Long Short-Term Memory"
    author: "Sepp Hochreiter, Jürgen Schmidhuber"
    publisher: "Neural Computation, 1997"
    url: "https://www.bioinf.jku.at/publications/older/2604.pdf"
---

Vanilla RNNs multiply a hidden state by a recurrent matrix every step. If that map's singular values are off, gradients explode or die, and the net cannot learn dependencies tens or hundreds of steps apart. LSTM adds a cell state designed to carry information with (near) identity transitions, plus learned gates — input, forget (in later popular formulations), output — that *multiply* to decide what to write, erase, and read. Hochreiter and Schmidhuber's 1997 paper is the analysis of vanishing error plus the constant-error carousel, not the exact `nn.LSTM` you import from a 2026 framework.

The forget gate that everyone uses was popularized in later refinements (Gers et al.). If you implement "LSTM from the 1997 equations" and compare to PyTorch, you will mismatch. Read a modern reference implementation for production; read 1997 for *why gates exist*.

## Why transformers did not delete the idea

Attention gives global mixing without a single path through time. LSTMs still show up in small on-device models, some speech stacks, and as a pedagogical baseline. More importantly, the *gated identity path* is the same instinct as residual nets and as the transformer residual stream: default to carrying state, learn the delta. If your custom recurrent block has no highway, you will rediscover 1997 the hard way.

Training still needs clipping, init, and sometimes truncated BPTT. LSTM is not "the vanishing gradient solved forever." It is "the vanishing gradient delayed long enough to learn interesting lags on the tasks of the day."

## Peepholes, bidirectionality, and stacking

Peephole connections, bidirectional LSTMs, and multilayer stacks are later standard tools. Bidirectional LSTMs leak the future; they are wrong for true online decoding. People still paste `bidirectional=True` into a streaming tagger. That is not Hochreiter's fault.

## A worked gate init

Forget gates initialized to remember (bias positive) help long-run training. Zero biases can start the cell as a brick. If your LSTM does not learn a 50-step delay copy task, check forget bias and whether you are feeding the target as input (teacher forcing leaks). The copy task is still a good unit test for a recurrent core.

## Failure modes

**BPTT through 10k steps** without truncation or checkpointing, then OOM, then "LSTM is dead."

**Using LSTM for bag-of-words problems.**

**Stacked LSTMs without residuals** at large depth.

**Comparing an untuned LSTM to a tuned transformer** on a huge corpus and calling it science.


## Framework LSTM is a bundle

`nn.LSTM` includes later gates, optional projections, and packed sequences. Packed padded sequences are how you avoid attending to pad in the recurrent sense. If you hand-roll a cell for a paper repro, test against a known delay task and against finite-difference gradients on a tiny example. Most "LSTM is unstable" reports are exploding grads on unbounded inputs or a learning rate copied from Adam+transformer. Clip, lower LR, and confirm the cell state is not NaN after 100 steps of noise.


Layer-normalized LSTMs (later work) are often easier to train than the 1997 cell on deep stacks. If you need a recurrent core in 2026, consider LN-LSTM or a tiny SSM before you debug raw LSTM init for a week. Keep 1997 as the reason gates exist.

## What you can borrow

- Put a multiplicative gate on an identity-ish state when you need long lag with sequential compute.
- Initialize forget-like gates to remember; test on a synthetic delay task.
- Keep unidirectional cores for streaming.
- Prefer transformers when you have parallel hardware and long-range mixing budget.
- Do not drop residual/highway thinking just because you left RNNs behind.
