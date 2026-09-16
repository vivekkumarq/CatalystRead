---
title: "Redis Data Structures and the Caching Patterns Built on Them"
slug: "redis-data-structures-and-caching-patterns"
description: "A tour of Redis's core data structures and the caching, rate-limiting, and leaderboard patterns each one is actually built for."
publishedAt: "2025-06-24"
updatedAt: "2026-09-16"
category: "Databases"
tags:
  - Databases
  - Redis
  - Caching
  - Performance
  - Backend
---

Treating Redis as "a key-value store you cache JSON strings in" leaves most of its actual value on the table. The reason Redis shows up in so many different roles — cache, rate limiter, leaderboard, session store, job queue — is that its data structures each map onto a specific access pattern, and picking the structure that matches the pattern is usually the difference between an elegant one-liner and a fragile pile of application-side logic reimplementing what Redis already does atomically.

## Strings: the obvious case, with a non-obvious feature

Plain key-value caching is a string operation, and the detail worth internalizing is `SET` with `EX`/`NX` doing more than it looks like it does:

```
SET session:abc123 '{"user_id": 42}' EX 3600 NX
```

`NX` means "only set if the key doesn't already exist," which makes this single command a correct, atomic distributed lock primitive — the basis of most Redis-based locking implementations — not just a cache write. Reaching for a separate locking library when this line already does it atomically is a common case of not knowing the primitive exists.

## Hashes: avoid the multi-key sprawl

Storing an object's fields as separate top-level keys (`user:42:name`, `user:42:email`) works but scales badly — no atomic "get everything about this user," and expiring the object means remembering to delete every key individually. A hash groups them under one key:

```
HSET user:42 name "Ava" email "ava@example.com" plan "pro"
HGET user:42 plan
EXPIRE user:42 3600
```

One key, one TTL, and `HGETALL` fetches the whole object in one round trip — this is almost always the better shape for "cache one row from the database" than a JSON-encoded string, because it also lets you update a single field (`HSET user:42 plan "enterprise"`) without reading, deserializing, mutating, and rewriting the whole blob.

## Sorted sets: leaderboards and time-ordered queues, for free

A sorted set keeps members ordered by score automatically, and both insertion and range queries are logarithmic — which makes it the direct, correct tool for leaderboards, priority queues, and rate-limiting windows, not something you'd want to reimplement with a list and manual sorting.

```
ZADD leaderboard 1500 "player_42"
ZADD leaderboard 2200 "player_7"
ZREVRANGE leaderboard 0 9 WITHSCORES     -- top 10
ZRANK leaderboard "player_42"             -- this player's rank
```

For sliding-window rate limiting, the score is a timestamp instead of a game score: add the current request's timestamp, trim everything older than the window with `ZREMRANGEBYSCORE`, and `ZCARD` gives you the request count in the window — all in a handful of atomic commands with no separate counting logic. The equivalent query against a relational table makes the contrast obvious:

```sql
-- What you'd otherwise run against Postgres on every leaderboard read,
-- with none of Redis's in-memory speed and a real risk of it becoming
-- the slowest query on the page under load
SELECT player_id, score,
       RANK() OVER (ORDER BY score DESC) AS rank
FROM scores
ORDER BY score DESC
LIMIT 10;
```

### Sets and lists: membership and ordered work

Sets give you `SADD`/`SISMEMBER` for O(1) membership checks (deduplicating events, tracking which users have seen a feature) and set algebra — `SINTER` between two users' "liked" sets is a one-line mutual-interest query that would otherwise be a join and a distinct. Lists back simple job queues via `LPUSH`/`BRPOP`, where the blocking pop means a worker can wait efficiently for work instead of polling.

## The caching pattern that actually needs care

The part of "just cache it in Redis" that bites teams isn't the write, it's invalidation and the thundering-herd problem: a hot key expiring and a burst of concurrent requests all missing the cache at once and hammering the database simultaneously. The fix is usually a short jittered TTL (so keys don't all expire in lockstep) combined with the `SET ... NX` lock pattern above to make sure only one request repopulates the cache while the rest wait briefly or serve slightly stale data — a pattern worth building once as a shared utility rather than reinventing per feature.

## A worked failure mode

A cache-aside pattern uses `GET` then `SET` without a stampede lock. After expiry, 200 pods hit the database for the same key. Another stores a mutable object in a STRING and `GET`/`SET` the whole blob for a one-field change; concurrent writes lose fields. A LIST is used as a job queue without visibility timeouts; crashed workers lose jobs or double-run. The failure is picking a structure without the concurrency story. Use SETNX/locks or request coalescing for thundering herds, hashes for partial updates, and a real queue with ACKs for work.

## When this is the wrong tool

Redis is the wrong source of truth for money. It is the wrong cache if you cannot describe invalidation. Do not use KEYS in production. A local in-process cache may beat Redis for a tiny, static config. Use Redis when the data structure matches and loss is acceptable for cache, or when you operate it as a designed datastore with persistence you understand.
