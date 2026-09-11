---
title: "DeepETA: When a Learned Model Beats Routing Math"
slug: "uber-deepeta-learned-arrival-times"
description: "How Uber's DeepETA replaced purely graph-based routing calculations with a deep learning model to correct systematic ETA errors at low latency."
publishedAt: "2026-02-17"
category: "Uber"
tags:
  - Engineering at Scale
  - Uber
  - Machine Learning
  - ETA Prediction
sources:
  - title: "DeepETA: How Uber Predicts Arrival Times Using Deep Learning"
    publisher: "Uber Engineering Blog"
    url: "https://www.uber.com/blog/engineering/"
---

Estimated time of arrival sits on nearly every screen in Uber's apps, and it's one of those numbers that users notice constantly and trust conditionally — a consistently wrong ETA erodes confidence in the whole app fast. Uber's traditional approach to ETA computed a route through its road network graph and estimated travel time from historical and current speed data on each segment along that route, a routing-engine approach that's principled and explainable but has a structural weakness: it computes travel time as the sum of segment-level estimates, which compounds any bias in those segment estimates and misses systemic patterns that don't show up cleanly as "this specific road segment is slow." DeepETA was Uber's move to close that gap with a machine learning model trained to predict actual arrival time directly, rather than only relying on summing per-segment routing estimates.

## Learning the residual, not replacing routing entirely

DeepETA wasn't built to throw out Uber's routing-engine ETA and replace it wholesale with a black-box model — the routing engine's segment-based estimate remains a core input. Instead, DeepETA is trained to predict a correction on top of that baseline estimate, learning systematic patterns the routing calculation tends to miss: recurring intersection delays not fully captured in segment speeds, patterns specific to time of day and day of week, and route-specific quirks that a purely additive segment-sum model can't represent well because they arise from the interaction of multiple segments and turns rather than any one segment in isolation. Framing the problem as learning a correction rather than an end-to-end replacement made the model's job narrower and its errors easier to bound relative to a known baseline.

## A transformer at a latency budget most transformer applications don't have

The technically distinctive part of DeepETA is squeezing transformer-style deep learning architecture into a prediction path with an extremely tight latency budget — every request that shows a rider or driver an ETA has to return in a small number of milliseconds at Uber's request volume, because ETA is computed constantly across the app, not just once per trip. That's a very different constraint from most transformer applications, where response times of hundreds of milliseconds or more are commonly acceptable. Uber's team spent real engineering effort on model efficiency techniques and serving optimizations specifically to make a deep learning model viable at that latency and request volume, rather than settling for a simpler model purely because deep learning was assumed too slow to serve inline.

## Feature inputs beyond the road graph

Because DeepETA predicts a correction rather than reconstructing the route calculation from scratch, it can draw on a broader feature set than a routing engine naturally would — historical trip data for similar routes and conditions, time-of-day and seasonality patterns, and other contextual signals that correlate with arrival time but don't map cleanly onto "which road segment is currently slow." That's the same general pattern behind Michelangelo-hosted models elsewhere in Uber's stack: a learned model can absorb messy, correlated signals that a hand-engineered calculation would need explicit rules to incorporate.

## Why accuracy here compounds elsewhere

ETA isn't just a number shown to a rider — it feeds pricing calculations, driver dispatch and matching decisions, and marketplace-level forecasting, so a systematic ETA bias doesn't stay contained to the arrival-time display; it propagates into decisions made elsewhere in the platform that depend on trip duration estimates being right. That's part of why Uber invested in a dedicated learned correction model rather than treating small, persistent ETA bias as an acceptable cost of the routing-engine approach.

## What you can borrow

- When a calculated estimate has systematic, recurring bias, consider training a model to predict the correction rather than replacing the whole calculation — it narrows the model's job and keeps errors bounded relative to a known baseline.
- Advanced model architectures aren't automatically ruled out by tight latency budgets; the engineering work to make them fast enough is often worth it if the accuracy gain is real.
- An estimate that feeds into other automated decisions (pricing, dispatch, forecasting) deserves more accuracy investment than its direct user-facing display alone would justify.
- Let a learned model absorb messy, correlated contextual signals that a rules-based calculation would otherwise need explicit hand-written logic to incorporate.
