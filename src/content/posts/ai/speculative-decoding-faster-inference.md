---
title: "Speculative Decoding: Draft Cheap Tokens, Verify With the Model You Actually Trust"
slug: "speculative-decoding-faster-inference"
description: "Leviathan et al. use a small draft model to propose token blocks and the large model to accept or reject them in parallel. Same distribution, fewer serial large-model steps, and the acceptance-rate math that decides whether you win."
publishedAt: "2026-10-21"
category: "AI"
tags:
  - AI
  - Inference
  - Performance
  - Research
sources:
  - title: "Fast Inference from Transformers via Speculative Decoding"
    author: "Yaniv Leviathan, Matan Kalman, Yossi Matias"
    publisher: "ICML 2023"
    url: "https://arxiv.org/abs/2211.17192"
---

Autoregressive decoding is serial: each large-model forward depends on the last token. Speculative decoding (also called speculative sampling) breaks that serial chain without changing the *distribution* of the large model. A cheaper drafter proposes several future tokens. The large model scores those positions in one parallel pass (a prefill-like chunk) and a rejection sampler keeps a prefix that is exactly as if you had sampled the large model alone.

Leviathan et al. made this practical and spelled the acceptance rule. The product promise is latency, not a new style of English. If your draft model is a bad imitator, you accept one token at a time and pay extra overhead. If it is a good imitator, you skip several large-model serial steps per round.

## Correctness is a sampling theorem, not a vibe

The algorithm is designed so the output law equals the target model's. That is why labs like it more than "just train a smaller model." You keep the 70B (or the API-quality) policy. You do not keep it if you approximate the rejection step, clamp logits differently, or use a drafter with a different tokenizer. Then you have a faster, *different* model. Say so in the eval.

Acceptance rate is the KPI. It depends on temperature, on how aligned the drafter is, and on the domain. Code with rigid syntax can accept long chunks. Open-ended poetry may not. Tune draft depth; longer drafts help only while they stay plausible.

## Systems constraints

You need to run two models. Memory must hold both, or you swap and lose the win. Shared vocab and chat templates are mandatory. Medusa-style heads and self-speculative methods try to draft from the target model itself to avoid a second weight set. Those are descendants. The 2023 paper is the two-model template.

Batching speculative requests is uglier than batching vanilla decode. If your server is already packed with large batches, speculative's win shrinks; it shines when you are latency-bound on small batches.

## A worked pair

Target: 70B instruct. Draft: 7B trained on the same mix and SFT. Draft K=5 tokens. You log mean accepted length. If it is 1.2, you are losing. Distill the 7B on 70B traces in-domain, retry. If it is 3.5, you ship and watch temperature: at T=0 greedy, acceptance often rises; at T=1.0 it falls. Do not quote a speedup from a greedy internal bench if production is sampled.

## Failure modes

**Tokenizer mismatch** silently ruining the rejection test.

**Measuring wall clock on an unloaded GPU** and then serving under a batch of 32.

**Drafter that was instruction-tuned differently**, so it proposes the wrong register (verbose vs terse).

**Claiming identical quality without a side-by-side eval** after you "simplified" the sampler.


## Measuring the right speedup

Report mean accepted length, target forwards per output token, and end-to-end ms at the production batch and temperature. A 3× on an empty GPU at T=0 does not survive a loaded server at T=0.8. Also track quality with a side-by-side or a KL estimate if you touched the sampler. Speculative decoding is allowed to be boring: same strings, fewer serial steps. If strings change, you shipped a different model and should say so.

## What you can borrow

- Keep the target distribution via a proper rejection rule; treat speedups without that rule as distillation.
- Track mean accepted tokens as the health metric.
- Colocate a compatible drafter; tokenizer and template are part of compatibility.
- Use speculation on latency-bound, small-batch decode, not as a universal throughput hammer.
- Skip it when a well-distilled 7B already meets quality — serving one model is simpler.
