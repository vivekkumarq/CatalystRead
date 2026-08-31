---
title: "ONNX and the Case for Model Portability"
slug: "onnx-and-model-portability"
description: "Why exporting models to ONNX solves real deployment problems, plus the conversion pitfalls that catch teams off guard the first time they try it."
publishedAt: "2026-06-10"
category: "Machine Learning"
tags:
  - Machine Learning
  - MLOps
  - Model Portability
  - Python
---

Training a model in PyTorch and needing to serve it from a C++ application, or a mobile app, or a serving stack that standardized on TensorFlow years before your team existed, is a common and annoying problem. ONNX (Open Neural Network Exchange) exists specifically to make the framework you trained in irrelevant to the framework — or language — you deploy in.

## What ONNX actually is

ONNX defines a standard computational graph format: nodes representing operations (convolution, matrix multiply, activation functions), edges representing tensors flowing between them. Any framework that can export to this format, and any runtime that can execute it, can interoperate — you train in PyTorch, export to ONNX, and run inference in the ONNX Runtime from Python, C++, C#, Java, or JavaScript, without PyTorch needing to be installed anywhere near the serving environment.

```python
import torch

model.eval()
dummy_input = torch.randn(1, 3, 224, 224)

torch.onnx.export(
    model,
    dummy_input,
    "model.onnx",
    input_names=["input"],
    output_names=["output"],
    dynamic_axes={"input": {0: "batch_size"}, "output": {0: "batch_size"}},
    opset_version=17,
)
```

The `dynamic_axes` argument matters more than it looks — without it, the exported graph bakes in a fixed batch size, and you'll get a cryptic shape-mismatch error the first time you try to run inference with any batch size other than the one you happened to export with.

## Running the exported model

```python
import onnxruntime as ort
import numpy as np

session = ort.InferenceSession("model.onnx", providers=["CPUExecutionProvider"])
input_name = session.get_inputs()[0].name
result = session.run(None, {input_name: np.random.randn(1, 3, 224, 224).astype(np.float32)})
```

ONNX Runtime typically runs meaningfully faster than the original training framework's eager-mode inference, because it applies graph-level optimizations — operator fusion, constant folding, redundant node elimination — that a training framework's execution engine doesn't bother with, since training prioritizes flexibility over inference speed.

## Where conversion actually breaks

Custom layers or operations that don't have a direct ONNX equivalent are the most common failure — a novel attention variant or a custom loss-adjacent layer built into the forward pass will often fail to export cleanly, or export as an unsupported operator that the target runtime can't execute. Control flow — if statements or loops that depend on tensor values rather than being resolved at trace time — is another common source of subtly wrong exports, because `torch.onnx.export`'s default tracing mode records the specific execution path taken for the dummy input you provided, not the general logic.

```python
# This branches on a Python bool, not a tensor value — traces fine but
# silently bakes in whichever branch the dummy input happened to take
if some_config_flag:
    x = layer_a(x)
else:
    x = layer_b(x)
```

Always validate numerically after conversion, not just structurally — a model that exports without errors can still produce different outputs than the original:

```python
torch_output = model(dummy_input).detach().numpy()
onnx_output = session.run(None, {input_name: dummy_input.numpy()})[0]
np.testing.assert_allclose(torch_output, onnx_output, rtol=1e-3, atol=1e-5)
```

## When portability is worth the conversion effort

| Situation | ONNX worth it? |
|---|---|
| Serving stack is a different language than training (C++, Java, mobile) | Yes — often the only practical bridge |
| Need faster CPU inference without a GPU in the serving path | Yes — graph optimizations often help meaningfully |
| Same framework end-to-end, GPU available, latency already fine | Usually not — added conversion step for limited benefit |
| Model uses heavy custom ops with no ONNX equivalent | Only after confirming export actually works cleanly |

The honest framing is that ONNX buys you deployment flexibility and often real speed, at the cost of an extra validation step in your release process — you're now shipping two artifacts (the training checkpoint and the exported graph) and need to confirm they agree before either one ships to production.
