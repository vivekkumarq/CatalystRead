---
title: "Activity Feeds at Etsy: Fanout for a Marketplace That Never Stops Listing"
slug: "etsy-activity-feeds-at-marketplace-scale"
description: "How Etsy built activity and following feeds when millions of shops produce events and naive fanout would melt the write path."
publishedAt: "2026-11-24"
updatedAt: "2026-11-24"
category: "Etsy"
tags:
  - Engineering at Scale
  - Etsy
  - Distributed Systems
  - Data Engineering
sources:
  - title: "Code as Craft"
    publisher: "Etsy"
    url: "https://www.codeascraft.com"
  - title: "Activity feeds"
    publisher: "Etsy"
    url: "https://www.codeascraft.com/blog"
---

A marketplace feed looks like a social network until you count the fanout. Etsy buyers follow shops, searches, and people. Shops list, relist, go on sale, and post about a new print. If you write every event into every follower's inbox at listing time, a popular shop becomes a write amplification incident. If you compute the feed only at read time by scanning everyone you follow, a user who follows thousands of shops waits on a scatter-gather that cannot make a mobile homepage. Etsy's feed engineering — discussed in various Code as Craft eras alongside the rest of their PHP/MySQL/queue stack — is the same push-versus-pull problem Twitter made famous, with marketplace-shaped events.

## Events are not tweets

A listing being created, a favorite, a sale ending, a shop announcement: they have different urgency and different spam profiles. Collapsing "shop listed 40 variants of the same mug" into one story is a product requirement, not a storage optimization. The feed also has to respect privacy and policy: a suspended shop should vanish, not linger in a materialized inbox until a TTL.

Etsy had the usual ingredients: a write-ahead of events, workers, Redis or memcached for hot timelines, and MySQL for durability in earlier designs. The interesting choice is which follows are push (materialize into inboxes) and which are pull (read-time join). High-follower shops are pull or hybrid; tiny shops can push. That heuristic is how you survive a celebrity shop without building a completely different product.

## Caching a homepage that is never the same twice

The logged-in homepage is a feed plus recommendations plus ads plus email-driven returns. Caching the whole page is wrong. Caching per-user feed segments with a short TTL is the game. Invalidation when you follow a new shop should not require rebuilding the world; it can splice. When a shop you follow lists, the push path updates inboxes that exist, and the pull path will see it on the next merge.

Backfill is the silent killer. A user who has not opened the app in a month should not trigger a million-event replay. Bound the lookback. Drop or compact old stories. Activity feeds are not compliance ledgers.

## Failure modes of marketplace fanout

The concrete failure is a worker pool that falls behind on a holiday listing burst, so feeds go quiet while the rest of the site is on fire in the other direction. Users think "Etsy is down" because their homepage is stale. Mid-size steal: separate feed workers from checkout workers, shed load by skipping low-priority story types, and show a freshness watermark.

Operational gotcha: push fanout that includes email and push notifications on the same path as the in-app inbox will page people for noise and then get you marked as spam. Different channels, different thresholds. Duplicate stories from retries without idempotent event IDs will make a shop look manic. Dedup keys belong in the inbox write. Graph storage for follow edges needs its own scaling plan; putting follows in the same table as listings is how a follow storm locks commerce. If you pull at read time, budget tail latency for the slowest shop's recent events. A timeout that omits the one shop the user actually cares about is a ranking bug. Test celebrity shops in staging with realistic follower counts, not 50 fake users. Unfollow and block must be fast paths: leaving a story in a materialized inbox after a block is a trust incident.

## What you can borrow

- Hybrid fanout: push to small audiences, pull or hybrid for celebrities, based on follower count.
- Collapse and rate-limit story types so a bulk listing is one row, not forty.
- Bound lookback and compact; feeds are not archives.
- Isolate feed processing from money paths, and give the UI a freshness signal when you shed.
