---
title: "Feature Engineering Patterns That Actually Generalize"
slug: "feature-engineering-patterns-that-generalize"
description: "A field guide to feature engineering techniques that hold up outside the notebook, from ratios and windowed aggregates to target encoding done safely."
publishedAt: "2026-03-25"
updatedAt: "2026-09-16"
category: "Machine Learning"
tags:
  - Machine Learning
  - Feature Engineering
  - Data Science
  - Python
---

Most of the lift you get in a real ML project comes from features, not from swapping algorithms. The problem is that feature engineering advice online skews toward tricks that look clever in a Kaggle notebook and fall apart in production because they either leak information or don't survive contact with live data. Here are the patterns that hold up.

## Ratios and differences beat raw magnitudes

Raw values are usually less informative than relationships between them. "Account balance" tells you less than "balance relative to 90-day average balance." "Transaction amount" tells you less than "amount relative to this customer's typical transaction size." These ratio features compress scale differences across your population into something the model can use consistently — a customer with a $50 average and a $500 one both get a comparably meaningful "5x normal" signal, whereas the raw amount alone conflates the two.

```python
df["balance_ratio_90d"] = df["balance"] / df["balance_avg_90d"].clip(lower=1)
df["amount_zscore"] = (
    (df["amount"] - df["customer_amount_mean"]) / df["customer_amount_std"].clip(lower=1)
)
```

The `.clip(lower=1)` isn't decoration — dividing by near-zero denominators is one of the most common silent sources of `inf` values that quietly corrupt downstream training.

## Windowed aggregates need a hard cutoff, computed correctly

Rolling averages, counts, and rates over the last N days are some of the highest-value features in most business problems, and also the easiest to leak. The aggregate for a row must only include data strictly before that row's timestamp, never data from the same day computed with an inclusive boundary that happens to include the label event itself.

```python
def rolling_count(df, group_col, time_col, window_days):
    df = df.sort_values(time_col)
    df = df.set_index(time_col)
    return (
        df.groupby(group_col)
        .rolling(f"{window_days}D", closed="left")["event_id"]
        .count()
    )
```

`closed="left"` is the detail that matters: it excludes the current row's own timestamp from the window, which is exactly what you need for a feature that's honest about what was known before the event happened.

## Target encoding without leaking the target

Encoding a high-cardinality categorical (zip code, merchant ID) as the mean target value for that category is powerful, but computing it naively — using the full dataset's mean, including the row you're encoding — leaks the label directly into the feature. The fix is out-of-fold encoding: compute the mean using only the folds that don't include the current row, exactly like a mini cross-validation.

```python
from sklearn.model_selection import KFold

def target_encode_oof(df, col, target, n_splits=5):
    encoded = pd.Series(index=df.index, dtype=float)
    kf = KFold(n_splits=n_splits, shuffle=True, random_state=42)
    for train_idx, val_idx in kf.split(df):
        means = df.iloc[train_idx].groupby(col)[target].mean()
        encoded.iloc[val_idx] = df.iloc[val_idx][col].map(means)
    return encoded.fillna(df[target].mean())
```

## Interaction features earn their keep only when the model can't find them itself

Tree-based models can approximate interactions between features through successive splits, so manually multiplying two features together rarely helps a boosted tree. It helps far more for linear models and for cases where the interaction is a genuine domain concept the model would need many splits to approximate — "days since last purchase, divided by average days between purchases" tells a linear model something it structurally cannot infer from the two components separately.

## The test that matters more than any individual technique

Before trusting any engineered feature, ask: could I compute this exact value, from exactly this data, at the moment of prediction in production, with no access to anything that happens after that moment? Features that pass an offline cross-validation check but fail this test are the single most common cause of a model that looks great in evaluation and collapses in production.

## A worked failure mode

Target encoding uses the row's own label. Cities are one-hot with `handle_unknown='error'` and production hits a new city. A feature cannot be computed at serve time because it needed a future join. The failure is features that do not survive new keys or time. Out-of-fold encodings, unknown buckets, and serve-time availability checks.

## When this is the wrong tool

Clever features are the wrong tool if they only work via leakage. Do not one-hot unbounded IDs. Engineer what you can compute when the model must score.

Copy-paste from an internal success is still a failure mode. The last team had different traffic, a different datastore, and six months of scars. "Feature Engineering Patterns That Actually Generalize" should be adopted with the scars attached: the dashboard they wished they had, the migration they feared, the incident that made the rule. If those artifacts are missing, you are adopting a slide. Spend a day interviewing the last on-call before you spend a quarter implementing their diagram.
A feature that needs a join you cannot run in the 20ms scoring budget will be replaced by a zero in production and silently degrade. Inventory serve-time dependencies the way you inventory model files. If a feature cannot be computed from the request plus a point-in-time store, it does not belong in the training table.
