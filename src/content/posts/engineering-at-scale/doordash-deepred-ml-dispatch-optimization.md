---
title: "DeepRed: How DoorDash Matches Orders, Dashers, and Time"
slug: "doordash-deepred-ml-dispatch-optimization"
description: "Inside DoorDash's dispatch system, which uses machine learning to balance delivery time, cost, and fairness when assigning orders to Dashers."
publishedAt: "2025-08-05"
category: "DoorDash"
tags:
  - Engineering at Scale
  - DoorDash
  - Machine Learning
  - Optimization
---

Matching a delivery order to a driver sounds like it should be simple — find the nearest available person and send them the job. At DoorDash's scale, across thousands of markets running simultaneously with wildly different densities of restaurants and Dashers, that naive approach leaves enormous efficiency on the table and produces worse outcomes for everyone: longer wait times for customers, less efficient routes for Dashers, and unnecessary delays for merchants. DoorDash built a dispatch system, referred to internally under names including DeepRed, that treats assignment as a continuous optimization problem solved with machine learning rather than a simple nearest-neighbor lookup.

## Assignment as prediction plus optimization

The dispatch problem splits naturally into two parts that DoorDash's system handles separately but jointly. First, prediction: how long will this order take to prepare at this merchant, how long will this Dasher take to arrive at the merchant, and how long will the delivery leg itself take given current traffic and distance. Second, optimization: given those predictions for every plausible pairing of available orders and Dashers in a market, which assignment minimizes overall delivery time and cost while keeping the system fair and stable, rather than greedily optimizing one order at a time in a way that starves other orders of good options.

This two-part structure matters because a system that only optimizes assignment without good underlying predictions will make confidently wrong decisions, while a system with great predictions but naive greedy assignment will still make locally-optimal choices that are globally inefficient — sending the closest Dasher to every order one at a time, for example, can leave a cluster of later orders with no good options left.

## Batching decisions instead of deciding order by order

Rather than assigning each incoming order to a Dasher the instant it's ready, DoorDash's dispatch logic considers batches of orders and available Dashers together over short time windows, which opens up assignments a purely sequential system would never find — such as one Dasher picking up two orders from restaurants near each other and delivering both efficiently, reducing total delivery time and cost across both orders simultaneously compared to sending two separate Dashers.

```text
Naive:    order arrives -> assign nearest available Dasher -> repeat
Batched:  collect orders + Dashers in window -> jointly optimize
          assignments (including multi-order batches) -> dispatch
```

This batching approach requires the system to make many assignment decisions within tight latency budgets, since customers and Dashers both expect a near-instant response, which pushed DoorDash toward efficient approximate optimization techniques rather than solving the assignment problem exactly, since exact solutions to this kind of matching problem don't scale to real-time constraints at high order volume.

## Feedback loops between prediction and outcomes

Because the predictions feeding the optimizer — prep time, travel time, delivery time — are themselves machine learning models, DoorDash continuously retrains them against actual observed outcomes, closing the loop between what the system predicted and what actually happened on a given delivery. A model that consistently underestimates prep time at a particular merchant, for instance, will systematically produce late-running assignments until retraining corrects for that merchant's real behavior, which makes the accuracy of these underlying predictions as operationally important as the optimization logic sitting on top of them.

## What you can borrow

- Split hard assignment problems into a prediction stage and an optimization stage, and invest in both — good optimization on bad predictions still produces bad outcomes.
- Batch decisions over a short time window when doing so unlocks better global outcomes, rather than always deciding greedily as each item arrives.
- Use approximate, latency-bounded optimization when an exact solution can't be computed within your real-time constraints.
- Continuously retrain the predictive models feeding an optimizer against real outcomes; stale predictions quietly degrade an otherwise well-designed system.
