---
title: "Choosing Evaluation Metrics: Precision, Recall, ROC, and Calibration"
slug: "choosing-evaluation-metrics-for-ml-models"
description: "A practitioner's guide to picking the right evaluation metric for a classification problem, and why a well-ranked model can still be badly calibrated."
publishedAt: "2026-04-23"
updatedAt: "2026-09-16"
category: "Machine Learning"
tags:
  - Machine Learning
  - Model Evaluation
  - Data Science
  - Statistics
---

Picking a metric is a business decision disguised as a technical one. Two models with identical AUC can behave completely differently in production depending on where you set the threshold and how much you care about false positives versus false negatives — the metric you optimize during development should reflect that, not just default to whatever scikit-learn prints first.

## Precision and recall are a trade-off, not two independent scores

Precision answers "of everything I flagged as positive, how much was actually positive?" Recall answers "of everything that was actually positive, how much did I catch?" Raising the classification threshold increases precision and decreases recall, and vice versa — you cannot maximize both simultaneously without changing the model itself.

```python
from sklearn.metrics import precision_score, recall_score, f1_score

for threshold in [0.3, 0.5, 0.7]:
    preds = (y_scores >= threshold).astype(int)
    print(
        threshold,
        precision_score(y_true, preds),
        recall_score(y_true, preds),
        f1_score(y_true, preds),
    )
```

F1 is the harmonic mean of the two, useful as a single number when you have no strong reason to prefer one over the other — but that's a weaker default than it sounds, because most real problems do have an asymmetric cost. A missed cancer diagnosis and an unnecessary follow-up test are not equally bad; optimizing plain F1 pretends they are.

## ROC-AUC measures ranking quality, not correctness at any threshold

ROC-AUC asks: if you pick a random positive and a random negative, what's the probability the model scores the positive higher? This is a genuinely useful property — it's threshold-independent, so it tells you whether the model has learned to separate the classes at all before you've committed to any specific operating point. But it doesn't tell you the model is well-calibrated, and on heavily imbalanced data it can look deceptively strong (see the companion piece on class imbalance) because the false positive rate denominator is dominated by an enormous negative class.

## Calibration: does 0.8 actually mean 80%?

A model can rank correctly — higher scores really do mean more likely positive — while its actual probability outputs are systematically off. If your model says 0.8 and, among all the times it said 0.8, only 55% of those cases were actually positive, the model is poorly calibrated even though its ranking (AUC) might be excellent. This matters enormously whenever downstream logic treats the score as a real probability — expected-value calculations, risk pricing, resource allocation by predicted probability.

```python
from sklearn.calibration import calibration_curve

prob_true, prob_pred = calibration_curve(y_true, y_scores, n_bins=10)
```

Plot `prob_pred` against `prob_true`; a perfectly calibrated model sits on the diagonal. Boosted trees and neural networks are commonly overconfident out of the box and benefit from post-hoc calibration — Platt scaling (fitting a logistic regression on top of the raw scores) or isotonic regression (a non-parametric monotonic fit) — applied on a held-out calibration set, never on the training set the model already fit.

## Matching metric to business cost

| Scenario | Cost asymmetry | Metric to prioritize |
|---|---|---|
| Fraud detection | Missed fraud >> false alarm | Recall at acceptable precision |
| Spam filtering | False positive (blocking real mail) is costly | Precision at acceptable recall |
| Medical screening | Missed disease is severe | Recall, often with human review layer |
| Loan pricing | Needs accurate probability, not just ranking | Calibration + AUC |

## The practical workflow

Report AUC or PR-AUC to communicate general model quality across a team, but make the actual go/no-go decision using precision and recall at the threshold you intend to deploy, and check calibration separately if any downstream system treats the output as a real probability rather than just a ranking signal. Conflating these three questions — can it rank, how does it perform at my threshold, are its probabilities honest — is the most common way a technically strong model still ships the wrong behavior.

## A worked failure mode

Fraud at 0.3% prevalence is judged by accuracy; always-no wins. A ranker is tuned on RMSE of a score only used for order. Thresholds are chosen on the test set. The failure is a metric that is not the decision. Use PR/ROC, cost, and a frozen threshold policy on validation.

## When this is the wrong tool

A zoo of metrics is the wrong tool if none maps to an action. Do not optimize BLEU for a safety-critical summary. One primary metric plus a few guards.

A second, quieter failure is operational: the idea is copied from a talk into a path that has no rollback, no owner, and no metric that would show the invariant breaking. For "Choosing Evaluation Metrics: Precision, Recall, ROC, and Calibration", that usually means a Friday deploy with production as the first realistic test. Write down the user-visible symptom, the invariant, and the revert before you scale the pattern. If revert is a data rewrite, you do not have a revert—you have a project. Practice the failure in staging with production-sized data at least once, or you will practice it on customers.
