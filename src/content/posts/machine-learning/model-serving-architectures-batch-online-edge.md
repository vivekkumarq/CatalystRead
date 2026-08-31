---
title: "Model Serving Architectures: Batch, Online, and Edge"
slug: "model-serving-architectures-batch-online-edge"
description: "A comparison of the three main ways to serve ML predictions in production, and how to pick the right one based on latency and data freshness needs."
publishedAt: "2026-06-04"
category: "Machine Learning"
tags:
  - Machine Learning
  - MLOps
  - Model Serving
  - Python
---

The same trained model can be deployed three structurally different ways, and picking the wrong one is a common source of unnecessary infrastructure cost or, worse, a latency requirement that quietly can't be met. The decision hinges on two questions: how fresh does the prediction need to be, and where does the compute need to happen?

## Batch inference: precompute everything, serve a lookup

Batch inference runs the model over a large set of inputs on a schedule, writes the predictions to a fast-lookup store, and the serving path becomes a simple key-value read rather than a live model call. This is the right choice whenever predictions don't depend on information that only exists at request time — a churn score recomputed nightly, product recommendations regenerated every few hours.

```python
def run_batch_inference(model, customer_ids, feature_store, prediction_store):
    features = feature_store.get_batch(customer_ids)
    predictions = model.predict(features)
    prediction_store.write_batch(dict(zip(customer_ids, predictions)))
```

The appeal is operational simplicity — no model-serving infrastructure in the request path at all, no latency SLA on the model itself, and you can throw as much compute at the batch job as you want without affecting user-facing systems. The cost is staleness: predictions are only as fresh as the last batch run, which is disqualifying for anything that needs to react to what a user just did.

## Online inference: compute on request, with a real latency budget

Online serving runs the model synchronously as part of a request, typically behind a REST or gRPC endpoint, when the prediction depends on real-time context — search ranking for the query just typed, fraud scoring for the transaction happening right now.

```python
from fastapi import FastAPI
import numpy as np

app = FastAPI()
model = load_model("model_v14.onnx")

@app.post("/predict")
def predict(features: dict):
    x = np.array([features[k] for k in FEATURE_ORDER]).reshape(1, -1)
    score = model.run(None, {"input": x.astype(np.float32)})[0]
    return {"score": float(score[0])}
```

Online serving forces you to actually engineer for latency: model loading time, feature-fetch latency, network hops, and the model's own inference time all stack up in the critical path of a user-facing request. Batching requests, model quantization, and caching frequently-requested features become real engineering concerns here in a way they simply aren't for batch inference.

## Edge inference: the model runs on the device, not your servers

Edge deployment ships the model itself to run on-device — a phone, a browser, an IoT sensor — rather than calling back to a server at all. This is the right call when network latency or connectivity is unreliable (offline-capable apps), when privacy requirements mean raw data shouldn't leave the device, or when round-trip latency to a server would be too slow for the use case regardless of how fast your server-side inference is (camera-based real-time effects, for instance).

The trade-off is that edge deployment constrains the model heavily: you're bound by the device's compute, memory, and battery budget, which usually means aggressive quantization, pruning, or a smaller architecture chosen specifically for edge deployment rather than accuracy alone.

## Comparing the three

| Approach | Latency to prediction | Freshness of inputs | Infra complexity |
|---|---|---|---|
| Batch | Instant (precomputed lookup) | Stale by batch interval | Low |
| Online | Milliseconds, in request path | Real-time | Medium-high |
| Edge | Milliseconds, no network round trip | Real-time, on-device only | High (per-platform builds) |

## A pattern that combines batch and online

A common hybrid: use batch inference for the expensive, slow-changing part of a prediction (a user's long-term preference profile, computed nightly) and combine it at request time with a cheap online computation that incorporates only what just happened (the last few actions in this session). This gets most of batch's cost efficiency while still reacting to real-time context, without needing the full model to run online.

Choosing between these three isn't a one-time architectural decision made at project kickoff — it's worth revisiting as a product's latency and freshness requirements change, since a model that started as a nightly batch job can genuinely outgrow that architecture once the product starts needing same-session responsiveness.
