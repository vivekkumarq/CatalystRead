---
title: "Detecting and Handling Model Drift in Production"
slug: "detecting-and-handling-model-drift"
description: "Why models degrade quietly after deployment, how to detect drift with statistical tests before it shows up in business metrics, and what to do about it."
publishedAt: "2026-03-13"
category: "Machine Learning"
tags:
  - Machine Learning
  - MLOps
  - Data Science
trending: true
---

A model that scored 0.91 AUC at launch doesn't stay at 0.91 forever. The world it was trained on keeps moving, and the model doesn't know that. Drift is the term for that gap growing, and the uncomfortable part is that it's usually invisible until someone downstream notices revenue or conversion dipping — long after the model itself started degrading.

## Two different problems that get lumped together

**Data drift** (also called covariate shift) is when the distribution of input features changes, but the underlying relationship between features and target stays the same. A fraud model trained on pre-holiday transaction patterns seeing a flood of gift-card purchases in December is data drift — the inputs look different, but fraud is still fraud the same way.

**Concept drift** is when the relationship itself changes — the same input now maps to a different output. A churn model where "cancels within 30 days of a price increase" used to mean price sensitivity, but after a competitor's product launch means something else entirely, is concept drift. This one is more dangerous because retraining on old labels won't fix it — you need new labels that reflect the new relationship.

## Detecting it before the dashboard tells you

The most direct approach is comparing the distribution of live features against the training distribution, using a statistical test per feature. Population Stability Index (PSI) is the standard for this in industry:

```python
import numpy as np

def psi(expected, actual, buckets=10):
    breakpoints = np.percentile(expected, np.linspace(0, 100, buckets + 1))
    breakpoints[0], breakpoints[-1] = -np.inf, np.inf
    e_pct = np.histogram(expected, breakpoints)[0] / len(expected)
    a_pct = np.histogram(actual, breakpoints)[0] / len(actual)
    e_pct = np.clip(e_pct, 1e-6, None)
    a_pct = np.clip(a_pct, 1e-6, None)
    return np.sum((a_pct - e_pct) * np.log(a_pct / e_pct))
```

A rough industry convention: PSI below 0.1 means no significant shift, 0.1–0.25 means moderate shift worth watching, above 0.25 means the distribution has meaningfully changed and you should treat the model's outputs with suspicion. Run this per feature, not just on the overall prediction distribution — a single dominant feature drifting can be masked by aggregate metrics staying flat.

For concept drift, PSI on inputs won't catch it, because the inputs haven't necessarily moved. You need either delayed ground truth (comparing predictions to actual outcomes once they arrive) or a proxy — model confidence distribution shifting, or an increase in disagreement between the production model and a periodically retrained shadow model.

## Building the monitoring loop

| Signal | Detects | Latency |
|---|---|---|
| Feature distribution (PSI/KS test) | Data drift | Immediate |
| Prediction distribution shift | Either type | Immediate |
| Label-based accuracy/AUC | Both, definitively | Delayed by feedback loop |
| Shadow model disagreement | Concept drift | Immediate, but noisy |

The immediate signals are your early warning system; the label-based signal is ground truth but arrives too late to prevent damage on its own. Most mature setups alert on the immediate signals and use the delayed signal to confirm.

## What to actually do when drift fires

Don't auto-retrigger a full retrain the moment PSI crosses a threshold — that's how you end up retraining on a one-day anomaly (a marketing campaign, a holiday) and baking noise into production. Instead: alert a human, hold the affected feature or segment for review, and only retrain once you've confirmed the shift is structural rather than transient. For concept drift specifically, retraining on the same labeling logic that's now stale won't help — you often need to revisit label definitions before touching the model at all.

Drift monitoring isn't a nice-to-have you add after an incident. It's the mechanism that turns "the model is degrading somewhere" into "feature X on segment Y drifted starting three days ago," which is the difference between a two-hour fix and a two-week investigation.
