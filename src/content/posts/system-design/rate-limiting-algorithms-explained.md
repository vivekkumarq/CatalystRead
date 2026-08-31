---
title: "Rate Limiting Algorithms: Token Bucket, Sliding Window, and What Actually Fits"
slug: "rate-limiting-algorithms-explained"
description: "Fixed window, sliding window, token bucket, and leaky bucket rate limiters compared, with the burst and fairness trade-offs each one hides."
publishedAt: "2025-03-04"
category: "System Design"
tags:
  - System Design
  - Distributed Systems
  - Backend Engineering
  - Scalability
---

Rate limiting looks like a solved problem until production traffic exposes which failure mode you actually chose. Every algorithm trades off memory, precision, and burst tolerance differently, and the wrong pick tends to surface only under load — usually during an incident, not a design review.

## Fixed Window Counters

The simplest implementation increments a counter per time bucket and resets it on rollover:

```python
def allow_request(key: str, limit: int, window_seconds: int) -> bool:
    bucket = int(time.time()) // window_seconds
    redis_key = f"rl:{key}:{bucket}"
    count = redis.incr(redis_key)
    if count == 1:
        redis.expire(redis_key, window_seconds)
    return count <= limit
```

It's cheap — one key, one increment — but it has a boundary problem: a client can burn its full limit in the last second of one window and the full limit again in the first second of the next, doubling the effective rate at the edge.

## Sliding Window Log and Sliding Window Counter

A sliding window log stores a timestamp per request and counts entries within the trailing window. It's exact, but memory scales with request volume — untenable for a busy endpoint.

The sliding window counter approximates it cheaply: weight the previous window's count by how much of it still overlaps the current window.

```
current_estimate = current_window_count
    + previous_window_count * (overlap_fraction)
```

This removes the boundary spike almost entirely at the cost of one extra counter and a small approximation error — the right trade for almost every API gateway.

## Token Bucket and Leaky Bucket

Token bucket allows bursts up to the bucket capacity, refilling at a steady rate. It's the algorithm behind most cloud provider quotas because it matches how real clients behave: idle, then bursty.

```python
class TokenBucket:
    def __init__(self, capacity: int, refill_rate: float):
        self.capacity = capacity
        self.tokens = capacity
        self.refill_rate = refill_rate
        self.last_check = time.monotonic()

    def allow(self) -> bool:
        now = time.monotonic()
        elapsed = now - self.last_check
        self.tokens = min(self.capacity, self.tokens + elapsed * self.refill_rate)
        self.last_check = now
        if self.tokens >= 1:
            self.tokens -= 1
            return True
        return False
```

Leaky bucket instead queues requests and drains them at a fixed rate — no bursts at all, just smoothing. It fits downstream systems that genuinely cannot handle spikes, like a fixed-capacity worker pool, at the cost of added latency for queued requests.

## Where the Algorithm Actually Runs

The algorithm matters less than where you enforce it once you're distributed. Per-instance counters are simple but let N instances each grant the full limit — a 10x overshoot behind ten pods. Centralizing in Redis with atomic `INCR`/Lua scripts fixes that but adds a network hop and a single point of contention.

| Scope | Consistency | Cost |
| ----- | ----------- | ---- |
| In-process | Loose (per-instance) | None |
| Redis / centralized store | Strong | Network round trip |
| Local + async sync | Approximate | Low latency, eventual accuracy |

A pragmatic middle ground: give each instance a local token bucket sized at limit/N, and periodically reconcile against a shared store. You lose exactness under uneven load distribution but keep the enforcement path off the hot request loop.

## Picking One

Match the algorithm to the traffic shape you're actually defending against: fixed window for cheap, approximate protection where bursts don't matter; sliding window counter as the default for public APIs; token bucket when legitimate clients burst and you want to allow it gracefully; leaky bucket when the thing behind you truly cannot absorb spikes. The mistake isn't picking the "wrong" one — it's not naming which failure mode (overshoot, unfairness, added latency) you're willing to live with before traffic tells you.
