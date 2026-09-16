---
title: "MLOps Pipelines: From Notebook to Production"
slug: "mlops-pipelines-notebook-to-production"
description: "How to turn a working Jupyter notebook into a reproducible, monitored production pipeline without rewriting everything from scratch."
publishedAt: "2026-03-08"
updatedAt: "2026-09-16"
category: "Machine Learning"
tags:
  - Machine Learning
  - MLOps
  - Data Science
  - Python
trending: true
---

The gap between "the model works in my notebook" and "the model is serving traffic reliably" is where most ML projects die. Not because the modeling was wrong, but because nobody planned for the plumbing: reproducibility, versioning, monitoring, and the fact that production data doesn't look like your training data forever.

## Notebooks are for exploration, not for execution

A notebook's execution order is whatever cells you happened to run, in whatever order, with whatever variables are still sitting in memory from three experiments ago. That's fine for exploration and terrible for production, where you need deterministic, repeatable runs. The first real step toward production is extracting notebook logic into plain Python modules with explicit inputs and outputs, then keeping the notebook only as a thin wrapper that calls those modules for exploration.

A useful discipline: if a function can't be unit tested without spinning up a kernel, it doesn't belong in the notebook.

## Pipeline stages worth making explicit

A production ML pipeline generally has five stages, each with its own versioning and failure mode:

1. **Data ingestion** — pulling raw data, validating schema, checking for nulls or type drift
2. **Feature computation** — transforming raw data into model inputs, ideally shared between training and serving
3. **Training** — with the exact code, data snapshot, and hyperparameters logged
4. **Evaluation** — against a held-out set and, critically, against the previous production model
5. **Deployment** — promoting a model artifact behind a versioned endpoint

Tools like Airflow, Dagster, or Kubeflow Pipelines exist to orchestrate this as a DAG rather than a sequence of manually-run scripts. The orchestrator isn't the interesting part — the interesting part is that each stage becomes independently retriable, testable, and observable.

```python
from dataclasses import dataclass

@dataclass
class TrainingRun:
    data_snapshot_id: str
    feature_set_version: str
    model_config: dict
    git_commit: str

def train(run: TrainingRun):
    df = load_snapshot(run.data_snapshot_id)
    X, y = build_features(df, version=run.feature_set_version)
    model = fit_model(X, y, run.model_config)
    log_run(run, model)
    return model
```

Note that every input to `train` is explicit and serializable. That's what makes a run reproducible six months later when someone asks why the model behaves differently than it did at launch.

## Training-serving skew is the bug that hides for months

The single most common production failure in ML systems isn't a bad model — it's a feature computed one way during training and a slightly different way during serving. Maybe training used a batch job that had access to future data by accident, or serving computes a rolling average over a different window than training did. The fix is architectural: define feature transformations once, in code shared by both paths, ideally backed by a feature store so training and serving read from the same computation logic.

## What to log before you need it

By the time a model misbehaves in production, it's too late to add logging. At minimum, log the model version, the feature values that produced each prediction, the prediction itself, and — once available — the outcome. This is what lets you debug a bad prediction after the fact and what feeds the drift monitoring you'll eventually need.

## CI/CD for models is not CI/CD for code

Standard software CI/CD checks that code compiles and tests pass. ML CI/CD needs an additional gate: does the newly trained model actually perform better (or at least not worse) than the current production model, on a fixed evaluation set? Skipping this gate is how teams end up silently regressing accuracy for weeks before someone notices in a dashboard, if they notice at all.

The overarching lesson is that MLOps isn't a separate discipline bolted onto data science — it's the recognition that a model in a notebook is a research artifact, and a model in production is a piece of infrastructure with all the reliability requirements that implies.

## A worked failure mode

A notebook is "productionized" by scheduling it. Paths are local, secrets in cells, no model registry, and the job overwrites the only artifact. A silent package bump changes preprocessing. Rollback is git blame. The failure is a pipeline without versions. Pin data snapshots, code, and model IDs; promote artifacts, do not retrain into prod unattended without eval gates.

## When this is the wrong tool

A full MLOps platform is the wrong tool for a one-off analysis. Do not delay a useful batch job for a catalog of 40 tools. Use lightweight jobs until more than one person must retrain safely. Graduate when silent overwrites would hurt customers.

When this pattern is stretched past its assumptions, the first outage looks like a mysterious performance cliff instead of a design limit. "MLOps Pipelines: From Notebook to Production" fails that way when traffic mix, data shape, or team skill does not match the blog that sold the approach. Keep a kill switch: feature flag, smaller blast radius, or an older path that still works. Measure the thing the idea claims to improve, not a vanity graph. If you cannot name a workload where you would refuse to use it, you have not finished the design.
