---
title: "The Same Movie, a Different Poster: Inside Netflix's Artwork Personalization"
slug: "netflix-artwork-personalization-image-selection"
description: "How Netflix decides which of several images to show for the same title, and why artwork selection became its own machine-learning problem."
publishedAt: "2026-01-15"
category: "Netflix"
tags:
  - Engineering at Scale
  - Netflix
  - Personalization
  - Machine Learning
sources:
  - title: "Netflix Technology Blog"
    publisher: "Netflix"
    url: "https://netflixtechblog.com"
  - title: "The Netflix Recommender System: Algorithms, Business Value, and Innovation"
    author: "Carlos A. Gomez-Uribe and Neil Hunt"
    publisher: "ACM Transactions on Management Information Systems, 2015"
---

Two members can open Netflix, both get the same title recommended in their "Trending Now" row, and see two completely different images representing it — one showing the show's romantic leads, the other showing an explosive action scene from an episode later in the season. That's not a bug or a random assignment; it's Netflix's artwork personalization system deciding, per member, which of several candidate images for the same title is most likely to earn a click, based on what that member has actually watched and engaged with before.

## Artwork as its own recommendation problem

It's tempting to treat artwork as a presentation detail sitting downstream of the "real" recommendation decision — first decide what to recommend, then just pick a poster. Netflix's data said otherwise: the same title, recommended to the same audience, gets meaningfully different engagement depending on which image represents it, because different images signal different things about a show and resonate with viewers who came to Netflix for different reasons. A viewer whose history is full of raunchy comedies might click on an image emphasizing a show's comedic ensemble, while a viewer who mostly watches tense dramas might be more drawn in by an image of the same show's most dramatic character. So Netflix treats artwork selection as its own personalization problem, with its own models, separate from the models that decide what to recommend in the first place.

## Contextual bandits, not a single "best" image

Because the goal is picking the most engaging image for a specific member in a specific context, Netflix's artwork system leans on contextual bandit techniques — approaches designed for exactly this kind of repeated decision problem, where you're choosing among several options (the candidate images) based on context (the member's viewing history and preferences) and updating your strategy based on the outcome (did they click). A bandit approach balances exploiting images already known to perform well against exploring less-tested images that might perform even better for a given member segment, rather than locking in on one "winning" image permanently based on early data.

This differs from a standard A/B test in an important way: rather than running one experiment to find a single best image for everyone, the system is continuously deciding, per member, which image to show, and using the resulting engagement data to keep refining those per-member decisions rather than converging on one static answer.

## Producing the candidates in the first place

None of this works without having multiple genuinely good candidate images to choose between, which pushed artwork personalization upstream into content production and creative operations as well — Netflix's creative teams produce multiple treatments of key art for a title specifically so the personalization system has real options to select from, rather than personalizing among a single image and a handful of low-effort crops. That creative-production requirement is a reminder that a personalization system is only as good as the diversity of genuinely distinct options it has to choose from; no amount of modeling sophistication compensates for every candidate looking essentially the same.

## What you can borrow

- Don't assume presentation details downstream of a "real" decision are unimportant — measure whether they actually affect the outcome you care about.
- Use bandit-style approaches, not one-shot A/B tests, when a decision needs to be made repeatedly and personalized rather than resolved to one global answer.
- Balance exploration against exploitation explicitly; committing too early to an early winner can cost you a better option you never gave a fair chance.
- Recognize that a personalization system's ceiling is often set by the diversity of inputs (candidate content) available to it, not just model sophistication.
