---
title: "Why XGBoost and LightGBM Still Win on Tabular Data"
slug: "gradient-boosting-tabular-data"
description: "Deep learning dominates images and text, but gradient boosted trees remain the default choice for tabular data — here's the technical reason why."
publishedAt: "2026-03-19"
category: "Machine Learning"
tags:
  - Machine Learning
  - XGBoost
  - Data Science
  - Python
---

Every year someone publishes a paper claiming a neural architecture finally beats gradient boosting on tabular benchmarks, and every year the practical answer on a random business dataset with 50,000 rows and a mix of categorical and numeric columns stays the same: reach for XGBoost or LightGBM first. It's worth understanding why, because the reasons are structural, not just inertia.

## Trees don't need feature scaling or dense representations

Neural networks learn smooth functions well, which is exactly what makes them strong on images and text — nearby pixels or nearby word embeddings really do carry similar meaning, and a smooth function generalizes across that similarity. Tabular data usually doesn't have that property. A "customer ID mod 7" style feature, or a categorical column with no ordinal relationship, can have wildly different target behavior between adjacent values. Trees split on thresholds and categories directly, without needing a smooth mapping to exist, and without needing you to scale or normalize anything first.

## Boosting corrects errors sequentially

A single decision tree is a weak, high-variance learner. Gradient boosting builds an ensemble where each new tree is trained to predict the residual error of the ensemble so far:

```python
import lightgbm as lgb

params = {
    "objective": "binary",
    "metric": "auc",
    "num_leaves": 31,
    "learning_rate": 0.05,
    "feature_fraction": 0.8,
    "bagging_fraction": 0.8,
    "bagging_freq": 5,
}

model = lgb.train(
    params,
    train_set=lgb.Dataset(X_train, y_train),
    valid_sets=[lgb.Dataset(X_val, y_val)],
    num_boost_round=2000,
    callbacks=[lgb.early_stopping(50)],
)
```

Each tree only needs to be slightly better than random on the current residuals; the ensemble accumulates those small corrections. The learning rate controls how much each tree is trusted — lower rates need more rounds but generalize better, which is why `early_stopping` against a validation set matters more here than the exact number of rounds you specify upfront.

## LightGBM vs XGBoost: the actual difference

Both implement gradient boosted trees; the difference is how they grow trees. XGBoost historically grew level-wise (all nodes at a given depth before going deeper), which is more conservative and slightly easier to control. LightGBM grows leaf-wise, always splitting the leaf with the highest loss reduction regardless of depth, which converges faster and often reaches better accuracy on large datasets but is more prone to overfitting on small ones — `num_leaves` becomes the parameter you need to watch closely instead of `max_depth`.

| Aspect | XGBoost | LightGBM |
|---|---|---|
| Tree growth | Level-wise (configurable) | Leaf-wise |
| Speed on large data | Good | Generally faster |
| Categorical handling | Needs encoding | Native support |
| Small-data overfitting risk | Lower default risk | Higher, needs tuning |

## Where boosting genuinely loses

None of this means trees are universally superior. On very high-cardinality sparse data — raw text, images, or datasets with millions of rows and hundreds of one-hot categorical levels — embeddings and neural nets start winning because they can share statistical strength across similar categories in a way tree splits can't. And on datasets under a few hundred rows, regularized linear models often beat both, because boosting has too many degrees of freedom relative to the signal available.

## The practical default

For a new tabular problem, start with LightGBM (or XGBoost if categorical native handling matters less than raw speed), tune `num_leaves`/`max_depth`, `learning_rate`, and `min_child_samples` before anything else, and treat a neural tabular model as something you reach for only after boosting has plateaued and you have a specific reason to believe embeddings would help — usually high-cardinality categoricals or a need to fuse tabular features with text or images in one model.
