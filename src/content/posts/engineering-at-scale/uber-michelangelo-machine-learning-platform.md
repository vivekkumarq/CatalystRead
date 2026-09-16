---
title: "Michelangelo: How Uber Turned Machine Learning Into a Self-Service Platform"
slug: "uber-michelangelo-machine-learning-platform"
description: "How Uber built Michelangelo to give data scientists a shared path from feature data to a deployed, monitored production ML model."
publishedAt: "2026-01-20"
updatedAt: "2026-09-16"
category: "Uber"
tags:
  - Engineering at Scale
  - Uber
  - Machine Learning
  - MLOps
sources:
  - title: "Meet Michelangelo: Uber's Machine Learning Platform"
    author: "Jeremy Hermann and Mike Del Balso"
    publisher: "Uber Engineering Blog"
    url: "https://www.uber.com/blog/engineering/"
---

Before Michelangelo, machine learning at Uber worked the way it does at most companies before they build dedicated ML infrastructure: every team that wanted a model — for ETA prediction, fraud detection, demand forecasting, restaurant recommendations for UberEats — solved data pipelines, training infrastructure, and production serving mostly from scratch, on their own. That meant duplicated infrastructure work across teams, inconsistent practices for things like feature computation, and models that were hard to reproduce or hand off. Uber built Michelangelo, its internal ML platform, to turn "train and deploy a model" into a supported, repeatable workflow instead of a bespoke project every time.

## Covering the whole lifecycle, not just training

Michelangelo's scope deliberately spans the full ML lifecycle: managing and sharing features (so teams aren't each recomputing similar signals independently), training models at scale across common frameworks, evaluating and comparing model performance, deploying trained models into production serving infrastructure, and then monitoring those models once they're live — tracking prediction accuracy and data drift over time rather than treating deployment as the finish line. That end-to-end scope was a deliberate choice: platforms that only handle training and stop there tend to just relocate the deployment and monitoring pain to individual teams anyway, without actually solving it.

A central piece of that lifecycle is the feature store — a shared repository of computed features that multiple models and teams can reuse, with consistent definitions and consistent computation between training time and serving time. That consistency matters more than it sounds: a common source of production ML bugs is subtle differences between how a feature was computed during offline training versus how it's computed for a live prediction request, producing a model that behaves differently in production than its offline evaluation suggested it would (training-serving skew). Michelangelo's feature store was built specifically to close that gap.

## Serving predictions at Uber's latency requirements

Because many of Uber's ML use cases are on the critical path of a live product decision — ETA estimation, dynamic pricing inputs, dispatch and matching signals — the platform had to support low-latency online prediction serving, not just offline batch scoring. That requirement shaped the platform's serving architecture toward supporting real-time feature lookups and fast model inference, distinct from the batch training and evaluation pipeline used to build the models in the first place.

## The organizational payoff

The real win from Michelangelo wasn't any single technical component, it was consolidation: teams across Uber stopped independently reinventing feature pipelines, training infrastructure, and deployment tooling, and instead built on a shared platform that already handled the undifferentiated heavy lifting. That let data scientists and ML engineers spend more of their time on the parts of the problem specific to their use case — feature selection, model architecture, evaluation criteria — instead of infrastructure plumbing that had already been solved once for everyone else on the platform.

Michelangelo became a widely cited example of the "ML platform" pattern that many large tech companies later built their own versions of, and it's frequently referenced in industry discussions of MLOps as an early, comprehensive example of the category before "MLOps" was a commonly used term.

## A concrete failure mode for an ML platform

Michelangelo aimed to make training, feature pipelines, and serving a paved path so every team did not invent a snowflake. The failure mode of a copycat platform is a UI that submits jobs nobody can reproduce, with undeclared data sources. Mid-size steal: a training job spec that pins data snapshot, code digest, and metrics, plus an online/offline feature contract.

Operational gotcha: a model that is "deployed" while its feature job is failing, so production scores defaults. Couple health: if features are stale, the model is unhealthy. Another is GPU queues that look shared-fair and are actually blocked by one hyperparameter sweep. Quotas. Uber-scale had many models on one platform; you may have three. A lightweight MLflow-plus-rules setup beats a two-year platform rewrite. Shadow traffic before a marketplace model can change prices or ETAs. Marketplace ML has feedback loops: the model changes supply, which changes the next training set. Steal holdouts. Access control on features that include personal data is part of the platform, not an afterthought. If data scientists can train on production dumps on laptops, you do not have Michelangelo, you have a leak. The steal is reproducibility and a serving path with an SLO, not a brand-name internal PaaS.

## What you can borrow

- A shared feature store isn't a nice-to-have — training-serving skew is a real, hard-to-debug failure mode, and consistent feature computation is the fix.
- Scope ML infrastructure to cover deployment and monitoring, not just training; a platform that stops at "here's your trained model" hasn't solved the actual production problem.
- Consolidating common ML infrastructure across teams pays off primarily as an organizational efficiency gain, not just a technical one.
- Match your serving architecture to your actual latency requirements — batch scoring and real-time inference are different engineering problems with different constraints.
