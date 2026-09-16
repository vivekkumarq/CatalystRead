---
title: "Twitter's Timeline Problem: Push, Pull, and the Celebrity Edge Case"
slug: "twitter-timeline-fanout-push-vs-pull"
description: "How Twitter combined fan-out-on-write and fan-out-on-read to keep timelines fast without letting celebrity accounts overwhelm the system."
publishedAt: "2025-11-07"
updatedAt: "2026-09-16"
category: "Twitter"
tags:
  - Engineering at Scale
  - Twitter
  - Distributed Systems
  - Feeds
---

Generating a home timeline — everything from the accounts you follow, merged into reverse-chronological order — sounds like a simple database query. At Twitter's scale, it isn't. A home timeline has to load in milliseconds, repeatedly, for hundreds of millions of users, many of whom follow hundreds or thousands of accounts. Querying and merging all of that at read time, for every request, is far too slow to build a usable product on top of.

## Pull: fan-out on read

The straightforward approach is to compute a user's timeline when they open the app: query recent tweets from everyone they follow, merge the results by time, and return the page. This is simple and never does wasted work for accounts nobody actually reads. But it's slow exactly when it matters most — at read time, for every request — and it gets worse the more accounts a user follows, since each additional followee is another source to query and merge.

## Push: fan-out on write

The alternative flips the work to write time: when a user tweets, immediately write that tweet into a precomputed timeline cache — commonly described as Redis-backed — for every one of their followers. Reads then become cheap: just read your own precomputed timeline, already assembled. The cost moves to the write path, and it moves in proportion to follower count. For the overwhelming majority of accounts, with modest follower counts, that's a fine trade. For an account with tens of millions of followers, a single tweet can trigger tens of millions of cache writes almost simultaneously — a fan-out storm that can overwhelm the write path if handled naively.

## A hybrid, not a single choice

Twitter's actual architecture, as described in their engineering writing and conference talks about their timeline service, is a hybrid of both models rather than a single global strategy. Most accounts use fan-out-on-write: their tweets get pushed into followers' precomputed timeline caches immediately, keeping reads fast for the common case. High-follower "celebrity" accounts are excluded from this eager fan-out. Instead, their tweets are merged into the relevant timelines at read time — a pull, applied only to the small set of high-fan-out accounts a given user follows — and combined with that user's regular precomputed timeline before the response is returned.

This pattern — special-casing the outliers rather than optimizing for the average case — shows up in other large feed systems too; Facebook's News Feed team has described similar tradeoffs between push and pull for their own high-fan-out cases. The underlying principle generalizes: the right fan-out strategy is a function of the specific write/read amplification for a given entity, not a single architectural decision applied uniformly to everyone.

## What a mid-size team can steal from timeline fanout

Twitter's push fanout writes a tweet into many follower timelines at write time; pull computes on read. The hybrid exists because celebrities break push and empty users waste it. Mid-size steal: push for small-degree users, pull for high-degree, and a merge at read. Do not push a post to a million inboxes from a Rails callback.

The concrete failure mode is a viral account that was classified as push until they crossed the threshold mid-incident, with half the followers in one world. Classification must be stable or dual-written during a move. Operational gotcha: deletes and visibility changes. A push timeline still showing a deleted tweet is a trust incident. Fanout a delete with higher priority than a new post, or pull the source of truth on read for the latest N. Unread and ranking layers on top of fanout multiply storage. Cap timeline length. Pull-on-read without a cache will melt the tweet store during a world event. Steal a cache of the merged view with a short TTL. If your social product has a median follower count of 40, push is fine. Measure the p99 degree. That number, not the architecture blog, picks the design. Notifications are a second fanout with different latency; do not reuse the home timeline queue blindly.

## What you can borrow

- Model feed generation explicitly as a write-amplification versus read-latency tradeoff, rather than assuming one strategy is correct for the whole system.
- Identify your own "celebrity" outliers — any entity whose fan-out is orders of magnitude larger than the median — early, and special-case them rather than let them degrade the common path or cause an incident when one appears.
- Precomputed caches with a hybrid pull-based fallback for known outliers is a durable, reusable pattern well beyond social feeds — it applies to any one-to-many broadcast problem.
- Measure your actual follower/fan-out distribution before picking an architecture; a strategy tuned for the median user can fail badly on the long tail.
