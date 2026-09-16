---
title: "PayPal Risk: Machine Learning in the Path of a Payment Without Becoming the Outage"
slug: "paypal-risk-machine-learning-fraud"
description: "How PayPal's risk systems score payments with models and rules so fraud can be stopped in milliseconds without freezing legitimate commerce."
publishedAt: "2026-11-27"
updatedAt: "2026-11-27"
category: "PayPal"
tags:
  - Engineering at Scale
  - PayPal
  - Machine Learning
  - Payments
sources:
  - title: "PayPal Tech"
    publisher: "PayPal"
    url: "https://medium.com/paypal-tech"
  - title: "PayPal Risk and fraud"
    publisher: "PayPal"
    url: "https://www.paypal.com/us/security/how-paypal-keeps-you-secure"
---

A payments company that does not score risk in the authorization path is a pass-through for stolen cards. A risk system that always says no is a payments company that does not exist. PayPal's advantage and burden is a long history of accounts, devices, and dispute outcomes — a graph of who paid whom — plus a latency budget measured in the same milliseconds as the checkout spinner. The engineering problem is not "train a classifier." It is serving features that are fresh enough to catch a new attack, models that can be rolled back, and a decision that still makes sense when the model host is on fire.

## Features are the product

Device fingerprints, IP reputation, velocity of payments from an account, age of the relationship, amount relative to history, shipping vs billing mismatch: these are features that must be computed or retrieved while the user waits. Some are batch (a user's 90-day graph). Some are streaming (three checkouts in a minute). PayPal-scale risk looks like a feature store plus an online graph, even if older generations used different names: caches of aggregates, real-time event pipelines, and rules that still exist because a model will not ship a patch at 2 a.m. when a new exploit appears.

Rules and ML are not a rivalry. Rules encode policy and emergency brakes. Models encode patterns in historical labels that are themselves delayed — a chargeback arrives weeks later. Training on late labels means you are always slightly fighting the last war. Adversaries adapt to whatever you publish in decline messages.

## Serving, shadowing, and human review

Online inference must have a timeout. If the model is late, you need a default: a rules-only path, a cached score, or a queue for step-up authentication (CAPTCHA, 2FA, a hold). Step-up is how you buy time without a hard decline. Shadow mode — new model scores without acting — is how you avoid a Tuesday when a retrained model declines half of Germany.

False positives are a customer-support cost and a brand cost. PayPal's two-sided network means a fraud ring can also look like a burst of legitimate P2P. Review queues and seller protection policies feed back into labels. Without that loop, the model optimizes a proxy that operations no longer believe.

## Failure modes of fraud models in the hot path

The concrete failure is a feature pipeline delay so every score is computed on yesterday's velocity, while an attack is happening now. Another is a model deploy that changes input schema and silently fills zeros. Mid-size steal: schema checks, canaries, and a kill switch that reverts to rules.

Operational gotcha: using decline reason codes that teach attackers which feature fired. Be vague externally, precise internally. Another is training on production traffic that includes your own testers and employees, or excluding them inconsistently. Latency: if risk adds 400ms, marketing will demand you skip it on "fast checkout," which is exactly the path attackers prefer. Budget risk inside the authorization SLA or you will lose the political fight. Data leakage — using a label that contains future dispute information at training time in a feature that is not available online — will inflate offline AUC and fail in prod. Keep train/serve parity tests. When the model host dies, do not fail open on high-dollar, new-device payments; fail to step-up or to a conservative rule. Record the score, version, and top features on the payment so a later chargeback is explainable to a human, not a mystery.

## What you can borrow

- Combine streaming velocity features with batch aggregates; yesterday's graph will miss today's burst.
- Always have a timeout path and a kill switch; the model is a dependency, not a religion.
- Shadow new models, and watch false-positive rate as a first-class SLO.
- Keep train/serve feature parity, or your AUC is a lab toy.
