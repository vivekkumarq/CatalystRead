---
title: "Train/Validation/Test Splits Done Right (Including Time Series)"
slug: "train-validation-test-splits-done-right"
description: "Random splits are wrong more often than practitioners assume — a walkthrough of when to use them and when time-based or grouped splits are required."
publishedAt: "2026-04-11"
updatedAt: "2026-09-16"
category: "Machine Learning"
tags:
  - Machine Learning
  - Data Science
  - Time Series
  - Model Evaluation
---

`train_test_split` with `shuffle=True` is the default in most tutorials, and it's the wrong choice for a surprising fraction of real problems. The split strategy needs to mirror how the model will actually be used in production, and for most business problems — forecasting, fraud detection, churn prediction — that means respecting time, not ignoring it.

## Why a random split lies to you on time-ordered data

If you shuffle rows before splitting, your model can end up training on data from next month and being validated on data from last month. In production, you will never have next month's data when predicting this month's outcome, so a random split systematically overstates how well the model will perform. The fix is a chronological split: everything before a cutoff date is training, everything after is validation, and nothing crosses that boundary.

```python
df = df.sort_values("event_date")
cutoff_train = "2026-01-01"
cutoff_val = "2026-02-15"

train = df[df["event_date"] < cutoff_train]
val = df[(df["event_date"] >= cutoff_train) & (df["event_date"] < cutoff_val)]
test = df[df["event_date"] >= cutoff_val]
```

## Cross-validation on time series needs its own shape

Standard k-fold cross-validation shuffles data into folds, which has the same future-leakage problem as a naive train/test split, just repeated k times. `TimeSeriesSplit` in scikit-learn instead grows the training window forward and always validates on the period immediately following it:

```python
from sklearn.model_selection import TimeSeriesSplit

tscv = TimeSeriesSplit(n_splits=5, gap=7)
for train_idx, val_idx in tscv.split(df):
    X_train, X_val = X.iloc[train_idx], X.iloc[val_idx]
    y_train, y_val = y.iloc[train_idx], y.iloc[val_idx]
```

The `gap` parameter is worth calling out specifically — it leaves a buffer between train and validation windows, which matters when your features have any kind of lag (a 7-day rolling feature computed right up to the boundary would otherwise still leak information about the validation window through overlap).

## When grouping matters more than time

Time isn't the only dimension that can leak. If your data has a natural entity — customers, patients, devices — and multiple rows per entity, a random or even chronological row-level split can still let the same entity appear in both train and test, letting the model memorize entity-specific quirks rather than general patterns. `GroupKFold` splits by entity instead of by row:

```python
from sklearn.model_selection import GroupKFold

gkf = GroupKFold(n_splits=5)
for train_idx, val_idx in gkf.split(X, y, groups=df["patient_id"]):
    ...
```

For time-series-with-entities problems — the common case in practice — you often need both constraints simultaneously: an entity's data shouldn't cross the time boundary, and no entity should appear split across train and validation at a single point in time. This usually means writing a custom splitter rather than relying on a single scikit-learn utility.

## Choosing split sizes and what test is actually for

| Split | Typical size | Purpose |
|---|---|---|
| Train | 60-80% | Fit model parameters |
| Validation | 10-20% | Tune hyperparameters, select model, early stopping |
| Test | 10-20% | Final, untouched estimate of production performance |

The discipline that's easy to lose in practice: the test set gets touched exactly once, at the very end. If you evaluate on it repeatedly while iterating, you've turned it into a second validation set, and your final reported number stops meaning what you think it means — you've effectively overfit to the test set through your own iteration process, even without a single line of code doing anything wrong.

## The one question that decides everything

Before picking a split strategy, ask what information will genuinely be available at prediction time in production. The split's job is to simulate that condition as closely as possible during evaluation. Everything else — the exact percentages, the number of folds — is a secondary decision that matters far less than getting this one right.

## A worked failure mode

Rows are shuffled despite being users with many sessions; the same user is in train and test. Hyperparameters are tuned on test because validation was burned. A time-based product is split randomly. The failure is a split that is not the production unit. Split by user or time, nest model selection inside validation, and touch test once.

## When this is the wrong tool

A three-way split is awkward if you have 80 rows—then you need more data or nested CV, not a fake test set. Do not hold out a test set you peek weekly. Use disciplined splits when you will make a ship decision.

When this pattern is stretched past its assumptions, the first outage looks like a mysterious performance cliff instead of a design limit. "Train/Validation/Test Splits Done Right (Including Time Series)" fails that way when traffic mix, data shape, or team skill does not match the blog that sold the approach. Keep a kill switch: feature flag, smaller blast radius, or an older path that still works. Measure the thing the idea claims to improve, not a vanity graph. If you cannot name a workload where you would refuse to use it, you have not finished the design.
