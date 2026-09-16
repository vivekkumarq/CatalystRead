---
title: "MLflow: An Experiment Log That Outlived the Notebook"
slug: "databricks-mlflow-experiment-tracking"
description: "Databricks open-sourced MLflow so teams could record parameters, metrics, and artifacts from training runs without each group inventing a spreadsheet protocol."
publishedAt: "2026-10-09"
updatedAt: "2026-10-09"
category: "Databricks"
tags:
  - Engineering at Scale
  - Databricks
  - Machine Learning
  - Developer Tools
sources:
  - title: "Introducing MLflow"
    publisher: "Databricks Blog"
    url: "https://www.databricks.com/blog/2018/06/05/introducing-mlflow-an-open-source-machine-learning-platform.html"
  - title: "MLflow documentation"
    publisher: "MLflow"
    url: "https://mlflow.org/docs/latest/index.html"
---

Training jobs are cheap to start and expensive to remember. Six months later nobody knows which learning rate produced the model in production, which data snapshot it saw, or which random seed. Databricks released MLflow in 2018 as an open source stack with four pieces that companies actually used unevenly: Tracking (experiments, runs, params, metrics, artifacts), Projects (reproducible packaging), Models (a flavor format for deployment), and a Model Registry (staging and production aliases). Tracking is the piece that changed daily practice. A `mlflow.log_param` in a notebook is not glamorous. A queryable history of every run is how a platform team stops arguing from screenshots.

## Runs are the unit of scientific memory

An MLflow run records a hierarchical experiment, user, git commit if you set it, and arbitrary key-value params. Metrics can be a time series (loss per epoch). Artifacts are blobs: plots, model files, conda YAML. The Tracking Server is a simple HTTP app in front of a database plus object storage. That simplicity is why it spread. It is also why people outgrow the default SQLite file and then discover they needed S3-backed artifacts and a real database from week two.

Reproducibility is a contract, not a button. If you log the metric and not the data version, you logged a vanity number. MLflow does not magically version your lake; it stores whatever you give it. Teams that integrate Delta table versions, feature-store commit IDs, and container digests into tags get something you can rerun. Teams that only log `accuracy=0.91` get a leaderboard.

## Registry, flavors, and the last mile that still hurts

The Model Registry added aliases (`production`, `staging`) and webhook-friendly stage transitions so deployment could be an approval, not a Slack message with a path. Model *flavors* (sklearn, PyTorch, custom Python) try to make `mlflow.pyfunc.predict` a lowest common denominator. The last mile remains serving: latency, GPUs, feature lookup at request time. MLflow does not replace a feature store or a model server. Databricks' later products bundled those; open source users still glue.

Failure modes are organizational. One tracking server for the whole company becomes a junk drawer of experiments named `test` and `test2`. Access control on experiments arrives late; notebooks leak data into artifact stores. Metric names diverge (`val_auc` vs. `auc_valid`) so you cannot compare. The platform fix is opinionated templates: required tags (ticket, data version, owner), naming conventions, and retention jobs that delete old artifacts before the bucket becomes a second lake.

The 2018 blog post framed MLflow as vendor-neutral. That mattered. Teams adopted tracking even if they did not buy Databricks, which made the later lakehouse integration easier rather than harder. The borrow is the habit: if it is not logged, it did not happen.

Compare-run views only work when metrics share units and names. A weekly office hours that rejects a model card without a data-version tag is more effective than another UI theme on the tracking server. Artifact stores also need lifecycle rules: model binaries and confusion-matrix PNGs outlive their usefulness and quietly become the team's second data lake. Pair retention with the registry so a `production` alias never points at a deleted blob.

## What you can borrow

- Log parameters, metrics, code version, and data version on every training run; accuracy alone is not a record.
- Put the tracking DB and artifact store on real infrastructure before the laptop SQLite file becomes tribal knowledge.
- Require a small set of tags (owner, ticket, dataset id) so the experiment UI remains searchable.
- Use a registry alias for production, not a raw path in a deploy script.
- Separate tracking from serving. A pyfunc wrapper is not an SLO.
