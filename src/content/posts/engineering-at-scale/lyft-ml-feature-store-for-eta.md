---
title: "Features on Time: Lyft's Store for ETA and Marketplace Models"
slug: "lyft-ml-feature-store-for-eta"
description: "Why Lyft invested in a feature store so training-time signals for ETAs and dispatch match what the production models see in the request path."
publishedAt: "2026-10-04"
updatedAt: "2026-10-04"
category: "Lyft"
tags:
  - Engineering at Scale
  - Lyft
  - Machine Learning
  - Data Infrastructure
sources:
  - title: "LyftLearn: ML platform"
    publisher: "Lyft Engineering"
    url: "https://eng.lyft.com/tagged/lyftlearn"
  - title: "Building a feature store"
    publisher: "Lyft Engineering"
    url: "https://eng.lyft.com/"
---

ETA models fail in a boring, expensive way: the feature you trained on is not the feature you serve. Training jobs join historical GPS traces, traffic tiles, and driver states from a warehouse. The production path has milliseconds, a partial view of the world, and a different code path that recomputes "time of day" or "distance to pickup" with another library. The model looks great offline and biased online. Lyft's machine learning platform (LyftLearn and related infrastructure posts) put a *feature store* in the middle so marketplace models — ETAs, ETAs-to-destination, fraud, and dispatch helpers — read named features with the same definition in batch and in the online path.

## Point-in-time correctness is the whole product

A feature store that cannot answer "what did we know at time t?" will leak the future. Training an ETA model with traffic that was only published after the trip started is a classic leak. Lyft-scale event logs make this easy to get wrong: late-arriving GPS, backfills, and timezone bugs. The store must support point-in-time joins against an entity key (driver, rider, geocell, origin-destination pair) and must version feature pipelines so yesterday's model can be reproduced.

Online serving then becomes a key-value lookup plus a small set of request-time features (the origin and destination just typed). The hard part is freshness SLAs. A traffic feature that updates every hour is useless for a crash on the freeway; a feature that updates every second is a distributed systems project. Lyft's marketplace needs both cadences. The store's job is to make those cadences explicit in metadata rather than tribal knowledge in a notebook.

## Dual pipelines and the drift you can measure

Even with a store, batch feature compute (Spark or similar) and streaming compute (Flink, custom) can diverge if they do not share code. The winning pattern is one transformation definition compiled into both, or a strict contract test that samples production lookups against a batch rebuild. Lyft's public engineering writing on ML platforms emphasizes productionizing models as a platform problem, not a data-science laptop problem. Feature monitoring — distribution shift, null rates, join miss rates — is how you catch a broken map tile pipeline before Prime Time misprices a city.

Entity modeling is a design choice with long consequences. If every feature is glued to `driver_id`, you cannot share "speed on this road segment" across drivers without duplication. If everything is a giant geocell key, you lose per-driver history. ETA systems typically mix: segment-level traffic, driver-level recent speed, and trip-level request features. The store should make those grains first-class, including documentation of expected cardinality, or you will blow Redis (or whatever online KV) with an unbounded key space.

The mid-size steal is modest: a catalog of named features, point-in-time training joins, an online KV with TTL, and a dashboard for nulls and drift. Do not start with a multi-year "feature platform rewrite" if you have three models. Do start the day the second team copies a SQL snippet that computes "distance" differently.

## What you can borrow

- Define features once; compile or test them in both batch training joins and online lookups.
- Enforce point-in-time joins. Future traffic data in training is a silent accuracy lie.
- Publish freshness SLAs per feature; not every signal needs sub-second updates.
- Monitor null rates, key miss rates, and distribution shift on the serving path.
- Model entity grains explicitly (trip, driver, segment) so the online key space stays bounded.
