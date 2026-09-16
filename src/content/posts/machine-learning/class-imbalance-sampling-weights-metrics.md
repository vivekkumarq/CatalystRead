---
title: "Class Imbalance: Sampling, Weights, and the Right Metrics"
slug: "class-imbalance-sampling-weights-metrics"
description: "Practical techniques for imbalanced classification, and why accuracy is the wrong number to optimize when the positive class is 2% of your data."
publishedAt: "2026-04-17"
updatedAt: "2026-09-16"
category: "Machine Learning"
tags:
  - Machine Learning
  - Data Science
  - Model Evaluation
  - Python
---

A model that predicts "not fraud" for every single transaction scores 98% accuracy on a dataset where fraud is 2% of rows. That number is technically correct and completely useless, which is why the first thing to fix about an imbalanced problem is usually the evaluation metric, before touching the training data at all.

## Fix the metric before you fix the data

Accuracy rewards the model for getting the majority class right, which it can do trivially by ignoring the minority class entirely. Precision, recall, F1, and PR-AUC are far more informative on imbalanced problems because they focus on how the model handles the class you actually care about:

```python
from sklearn.metrics import precision_recall_curve, average_precision_score

precision, recall, thresholds = precision_recall_curve(y_true, y_scores)
ap = average_precision_score(y_true, y_scores)
```

PR-AUC in particular is more honest than ROC-AUC on heavily imbalanced data, because ROC-AUC's false positive rate denominator (all negatives) is so large that a substantial number of false positives barely moves the curve. PR-AUC's precision denominator is the count of predicted positives, which stays sensitive to false positives even when negatives vastly outnumber positives.

## Class weighting: the first lever, not the last resort

Before resampling anything, try weighting the loss function so misclassifying the minority class costs more. Most scikit-learn estimators and boosting libraries support this natively:

```python
from sklearn.utils.class_weight import compute_class_weight

weights = compute_class_weight("balanced", classes=np.unique(y_train), y=y_train)
class_weight_dict = dict(zip(np.unique(y_train), weights))

model = LogisticRegression(class_weight=class_weight_dict)
```

This has an advantage over resampling: it doesn't touch the data distribution at all, so you're not introducing synthetic patterns or throwing away real examples. It's usually the right first thing to try, and often the only thing you need.

## When resampling still helps

**Random oversampling** duplicates minority-class examples; **random undersampling** drops majority-class examples. Both are simple and both have failure modes — oversampling can cause the model to overfit to the specific duplicated rows, and undersampling throws away potentially useful majority-class information, which matters more the smaller your dataset already is.

**SMOTE** (Synthetic Minority Oversampling Technique) generates new synthetic minority examples by interpolating between existing minority examples and their nearest neighbors, rather than duplicating rows outright:

```python
from imblearn.over_sampling import SMOTE

smote = SMOTE(random_state=42)
X_resampled, y_resampled = smote.fit_resample(X_train, y_train)
```

One rule that's easy to violate by accident: resampling must happen only on the training fold, after the train/validation split, never before it. Resampling before splitting lets synthetic or duplicated points derived from training rows leak into validation, inflating your evaluation metrics in a way that won't hold in production.

## Choosing a strategy by imbalance severity

| Imbalance ratio | Typical approach |
|---|---|
| Mild (e.g. 70/30) | Class weighting alone, usually sufficient |
| Moderate (e.g. 95/5) | Class weighting, optionally combined with light oversampling |
| Severe (e.g. 99.5/0.5) | Weighting + SMOTE or undersampling, plus threshold tuning, plus anomaly-detection framing if labels are too sparse to trust |

## Don't forget the decision threshold

Even a well-trained model on imbalanced data will underperform if you leave the classification threshold at the default 0.5. That threshold assumes the two classes are equally likely and equally costly to misclassify, which is rarely true for imbalanced problems. Tune the threshold against the precision/recall trade-off that matches the actual business cost of a false positive versus a false negative — for fraud, that's usually a much lower threshold than 0.5, because missing fraud is typically costlier than a false alarm that a human reviews.

## A worked failure mode

SMOTE is applied before the split; synthetic minorities leak into test. Class weights are so extreme that precision collapses and human reviewers drown. Accuracy is still reported as the headline. The failure is resampling as magic. Split first, sample or weight only train, and measure the operating point you will staff.

## When this is the wrong tool

Resampling is the wrong tool if you can collect real minority examples. It will not fix mislabeled rares. Cost-sensitive thresholds often beat synthetic rows. Use imbalance methods when the metric matches the decision.

Copy-paste from an internal success is still a failure mode. The last team had different traffic, a different datastore, and six months of scars. "Class Imbalance: Sampling, Weights, and the Right Metrics" should be adopted with the scars attached: the dashboard they wished they had, the migration they feared, the incident that made the rule. If those artifacts are missing, you are adopting a slide. Spend a day interviewing the last on-call before you spend a quarter implementing their diagram.
If the minority class is noisy, resampling amplifies the noise and reviewers drown in false positives. Prefer collecting better labels, then pick a threshold from reviewer capacity, not from a default of 0.5. Report precision at that capacity every week so a weight tweak cannot silently explode the queue.
