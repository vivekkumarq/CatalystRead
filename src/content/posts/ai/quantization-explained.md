---
title: "Quantization Explained: What You Lose and What You Gain"
slug: "quantization-explained"
description: "A practical breakdown of LLM quantization techniques, the real quality trade-offs behind them, and how to decide how far to push it."
publishedAt: "2026-07-18"
category: "AI"
tags:
  - AI
  - Quantization
  - Inference
  - LLMs
---

Quantization gets pitched as a free lunch — smaller model, faster inference, "minimal quality loss" — and the reality is more specific than that framing suggests. The quality cost is real, it's uneven across tasks, and the right amount of quantization depends entirely on what you're using the model for. Treating it as a single dial from "full precision" to "aggressively quantized" hides the decisions that actually matter.

## What's actually being reduced

Model weights are normally stored as 16-bit floating point numbers (fp16 or bf16). Quantization reduces the numeric precision used to store and compute with those weights — commonly to 8-bit integers (int8) or 4-bit representations — which directly shrinks memory footprint and, because inference is largely memory-bandwidth bound, speeds up generation by reducing how much data has to move through memory per token.

```text
fp16:  16 bits/weight  →  baseline size, baseline quality
int8:   8 bits/weight  →  ~50% size, small quality loss on most tasks
int4:   4 bits/weight  →  ~25% size, noticeable loss on some tasks
```

The size reduction is straightforward arithmetic. The quality impact is where it gets task-dependent.

## Where quality loss shows up first

Aggregate benchmark scores (perplexity, general QA accuracy) tend to hold up reasonably well down to int8 and often even int4 for many models. But aggregate scores hide where the damage actually concentrates: tasks requiring precise numeric reasoning, multi-step logical chains, and low-frequency factual recall degrade disproportionately compared to fluent text generation or general conversation. A quantized model can sound just as coherent while being measurably worse at arithmetic or at correctly recalling a specific fact it would have gotten right at full precision. If your application leans on those capabilities, benchmark on your own task — not a general leaderboard — before deciding a quantization level is safe.

## Quantization methods aren't interchangeable

- **Post-training quantization (PTQ)**: quantize an already-trained model's weights, no retraining needed. Fast and cheap to apply, but the model wasn't trained with the numeric precision loss in mind, so quality degradation is more pronounced at aggressive bit widths.
- **Quantization-aware training (QAT)**: simulate quantization effects during training or fine-tuning, so the model adapts its weights to be robust to the precision reduction. Better quality at a given bit width, but requires training infrastructure and data — not a quick post-hoc step.
- **Weight-only vs. weight-and-activation quantization**: quantizing only the stored weights (while computing in higher precision) is safer and simpler; quantizing activations too gives further speed gains but is more sensitive to outlier values in practice and needs more careful calibration to avoid quality cliffs.

```python
# Conceptual: weight-only int8 quantization
def quantize_weights(weights_fp16, scale=None):
    scale = scale or (weights_fp16.abs().max() / 127)
    weights_int8 = (weights_fp16 / scale).round().clamp(-127, 127).to(int8)
    return weights_int8, scale  # scale needed to dequantize during compute
```

## Deciding how far to push it

| Use case | Reasonable starting point |
|---|---|
| High-stakes reasoning, numeric/financial tasks | fp16 or int8, validate carefully before going lower |
| General chat, summarization, creative tasks | int8 usually safe, int4 often acceptable |
| Edge/on-device deployment, cost-constrained batch jobs | int4 or lower, accept the trade-off deliberately |
| Anything user-facing with brand risk from visible errors | Benchmark on your specific eval set before committing |

The only reliable way to answer "how far can we quantize" is to run your own eval suite — the same one you'd use for a model swap — at each candidate precision level and compare against your specific task distribution, not a general benchmark. A quantization level that's fine for a summarization feature can be unacceptable for a feature that does arithmetic on user data, even though it's the same underlying model.

## The infrastructure trade-off is real too

Lower precision isn't free even on the infrastructure side — not every GPU has efficient kernels for every bit width, and int4 inference sometimes trades memory savings for compute overhead depending on hardware support. Validate the actual latency and throughput gain on your target hardware rather than assuming linear scaling with bit width; the theoretical size reduction doesn't always translate into a proportional speed gain in practice.
