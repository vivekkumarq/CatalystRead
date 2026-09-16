---
title: "Core ML: Inference That Ships in the App Binary"
slug: "apple-coreml-on-device-inference"
description: "Apple's Core ML runtime runs converted models on CPU, GPU, and Neural Engine so features like camera effects and keyboard suggestions do not need a round trip to a datacenter."
publishedAt: "2026-10-27"
updatedAt: "2026-10-27"
category: "Apple"
tags:
  - Engineering at Scale
  - Apple
  - Machine Learning
  - On-device
sources:
  - title: "Core ML documentation"
    publisher: "Apple Developer"
    url: "https://developer.apple.com/documentation/coreml"
  - title: "Core ML Tools"
    publisher: "Apple"
    url: "https://apple.github.io/coremltools/"
---

A camera shutter cannot wait on a WAN round trip. Apple's on-device features — scene classification, on-device dictation pieces, image subject lifting, keyboard next-word — run through Core ML: a model package (`.mlmodel` / `.mlpackage`) compiled for the device, executed by a runtime that assigns operators to CPU, GPU (Metal), or the Neural Engine (ANE). `coremltools` converts from PyTorch or ONNX, with quantization and op-mapping as the actual work. The product bet is latency, privacy (pixels stay on device), and offline function. The engineering bet is that a converted graph will match training numerics closely enough that QA will not reject the feature.

## Conversion is the product

Not every PyTorch op has an ANE kernel. Conversion either decomposes the op, falls back to CPU (slow, battery-heavy), or fails. Teams that train with exotic activations learn this at the Core ML compile step, which is the wrong time. The discipline is a *supported-op allowlist* in training, plus a golden-image test: same input tensor, bounded numeric drift vs. Python. Quantization (FP16, INT8, later palettization) is required to fit models in RAM and to use ANE efficiently; it is also where accuracy dies if the calibration set is wrong.

Model size is an App Store tax. A 200 MB vision model in the binary affects download conversion. Apple provides background download and on-demand resources patterns; Core ML models can be compiled at install or on first launch (`MLModel.compileModel`). First-launch compile stalls users if you do it on the main thread. Cache compiled models in the app container.

## Scheduling silicon and not melting the phone

The runtime's compute-unit hints (`cpuOnly`, `cpuAndGPU`, `all`) are not cosmetics. ANE is great for steady CNN-like graphs and can be worse or unavailable for some control-flow-heavy models. GPU contends with UI rendering. Thermal and battery throttling change performance mid-session; a demo on a plugged-in iPhone 15 Pro does not predict a warm iPhone in a pocket. Profile with Instruments (Core ML and ANE instruments) on the *minimum* device you claim to support.

Privacy is a process: if you log images for debugging, you have a cloud pipeline you claimed not to need. On-device also means you cannot hot-patch a bad model without an app update or a downloaded model with its own signing story. Apple's ML model deployment has to think about signing and rollback like any other asset.

The steal is the split of product features into "must be on device" vs. "can be server." For the former, constrain training ops, test conversion in CI, budget size and thermals, and never block the UI thread on compile or first inference.

Input preprocessing must match training. A vision model that trained on a specific crop and color space will look "Core ML is inaccurate" if the camera buffer is a different format. Keep the preprocessing graph inside the model package when you can, so iOS and Python cannot drift. When you cannot, share one documented tensor layout and fail closed if the buffer size is wrong.

## What you can borrow

- Train within the operator set your on-device runtime actually accelerates.
- Golden-test converted and quantized models against the training framework on a fixed batch.
- Compile and load models off the main thread; cache the compiled artifact.
- Profile on the slowest supported device, under thermal load, not only on the marketing SKU.
- Sign and version downloaded models; on-device does not mean unpatchable without a plan.
