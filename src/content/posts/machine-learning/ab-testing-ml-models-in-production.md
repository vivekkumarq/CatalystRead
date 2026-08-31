---
title: "A/B Testing Machine Learning Models in Production"
slug: "ab-testing-ml-models-in-production"
description: "Offline metrics tell you a new model is better in theory. A/B testing tells you whether it actually moves the numbers that matter — here's how to do it right."
publishedAt: "2026-05-17"
category: "Machine Learning"
tags:
  - Machine Learning
  - MLOps
  - Experimentation
  - Data Science
---

A model that improves offline AUC by two points can still make a product worse. Offline metrics measure prediction quality against historical labels; they don't measure what happens when the prediction changes user behavior, interacts with other systems, or gets served under real latency constraints. That gap is exactly what A/B testing is for, and treating it as a formality after the offline win is how teams ship regressions they never see coming until revenue does.

## Randomization is the entire point — don't compromise it

The core requirement is that assignment to control (existing model) or treatment (new model) is random and independent of anything that could correlate with the outcome. A common mistake: assigning by geographic region, time of day, or some other convenient but non-random split. If treatment runs only on weekday traffic and control includes weekends, any difference you measure is contaminated by that confound, not attributable to the model.

```python
import hashlib

def assign_variant(user_id: str, experiment_name: str) -> str:
    h = hashlib.sha256(f"{experiment_name}:{user_id}".encode()).hexdigest()
    bucket = int(h, 16) % 100
    return "treatment" if bucket < 50 else "control"
```

Hashing the user ID with the experiment name gives you deterministic, reproducible assignment — the same user always lands in the same bucket for a given experiment, which matters for a consistent user experience, and different experiments get independent, uncorrelated bucketing because the hash input differs.

## Pick the metric before you look at results

Decide the primary success metric — conversion rate, revenue per user, click-through rate, whatever the model is actually meant to influence — before the experiment starts, and register it. Looking at a dozen metrics after the fact and reporting whichever one moved is how you end up celebrating noise; with enough metrics, something will cross a significance threshold by chance alone.

## Sample size and duration aren't optional homework

Running an underpowered test and calling a result "directionally positive" is a common way to ship a model that isn't actually better. Compute the required sample size upfront from your baseline conversion rate, the minimum effect size worth detecting, and your desired power — typically 80%:

```python
from statsmodels.stats.power import NormalIndPower
from statsmodels.stats.proportion import proportion_effectsize

effect_size = proportion_effectsize(0.052, 0.05)  # 5.2% vs 5% baseline
analysis = NormalIndPower()
n_per_group = analysis.solve_power(effect_size, power=0.8, alpha=0.05)
```

Small effect sizes need large samples, and if your traffic volume can't reach that sample size within a reasonable window, either the effect you're hoping to detect is too small to be worth this experiment, or you need to extend the test duration rather than call it early on a promising-looking but underpowered result.

## Guard against novelty effects and seasonality

A new model's early results can be skewed by users reacting to something merely being different, not better — this fades over 1-2 weeks in many consumer products. Running the test across at least one full weekly cycle, and ideally longer, controls for both novelty effects and day-of-week seasonality that a 3-day test would miss entirely.

## Shadow deployment before the real test

Before exposing real users to a new model's decisions, run it in shadow mode: serve predictions from both models, log both, but only act on the control model's output. This catches infrastructure problems — latency regressions, serialization bugs, unexpected input edge cases — without any user-facing risk, and it gives you an early read on how different the new model's predictions actually are before you spend experiment budget finding out.

| Stage | Purpose | User impact |
|---|---|---|
| Offline evaluation | Sanity-check model quality against historical data | None |
| Shadow deployment | Catch infra and serving bugs | None |
| A/B test | Measure real causal effect on business metric | Partial, randomized |
| Full rollout | Ship | Full |

Skipping straight from offline evaluation to full rollout is the step most postmortems trace back to. The A/B test isn't bureaucracy — it's the only stage that actually answers "does this model make the product better," as opposed to "does this model predict historical labels more accurately."
