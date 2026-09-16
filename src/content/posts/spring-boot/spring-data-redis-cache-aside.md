---
title: "Spring Data Redis Cache-Aside: TTLs, Stampede, and the Null That Was a Miss"
slug: "spring-data-redis-cache-aside"
description: "Cache-aside with RedisTemplate and @Cacheable: serialization, stampede locks, negative caching, and when the annotation hides a thundering herd."
publishedAt: "2026-09-11"
category: "Spring Boot"
tags:
  - Spring Boot
  - Redis
  - Caching
  - Spring Data
sources:
  - title: "Spring Data Redis"
    publisher: "Spring"
    url: "https://docs.spring.io/spring-data/redis/reference/"
  - title: "Caching Annotations"
    publisher: "Spring Framework"
    url: "https://docs.spring.io/spring-framework/reference/integration/cache/annotations.html"
---

Cache-aside is the pattern: read cache, on miss load DB, write cache. Spring's `@Cacheable` plus a Redis `CacheManager` is that pattern with AOP. It is easy to ship and easy to stampede. A TTL of 5 minutes on a hot key that expires at the same instant for every replica is a coordinated DB spike, not a cache.

## Aside, not write-through by default

`@Cacheable` loads on miss. `@CachePut` / `@CacheEvict` are how writes stay coherent. If you update Postgres and forget eviction, Redis serves the ghost. Transactional listeners (`@TransactionalEventListener(AFTER_COMMIT)`) should own eviction so a rollback does not leave a new cache value. Two-phase thinking: DB is source of truth; Redis is a hint with a TTL.

```java
@Cacheable(cacheNames = "user", key = "#id")
public User get(long id) { return repo.findById(id).orElseThrow(); }
```

Serialization: JDK serialization is a footgun. Prefer JSON or a typed codec and a **versioned key prefix** (`user:v2:`) so deploys do not decode garbage. Key design: include tenant. `user:42` on a shared Redis is a cross-tenant bug.

## Misses, nulls, and herds

`@Cacheable` unless configured will cache **null** (unless `unless="#result == null"`). Caching nulls (negative caching) protects you from hammering the DB for missing ids; it also caches "not found" through a create. Choose TTL for negatives shorter than positives.

Stampede: 200 pods miss together. Options: randomized TTL jitter, single-flight (a per-key lock in Redis with `SET NX` plus wait), or a request coalescer in-process. Spring does not do this for you. `sync=true` on `@Cacheable` only syncs **one JVM**.

Redis Cluster: keys that must be atomic together need hash tags `{user42}profile`. Pipelines and MGET across slots fail. Timeouts: a slow Redis plus a huge Hikari pool is a deadlock-shaped outage; fail open or closed **on purpose**. Fail open means DB load; fail closed means errors.

## When not to use @Cacheable

Huge objects, per-request uniqueness, or methods that are not functions of their arguments (time, security context). Also methods called from `this` — AOP will not intercept. Use `RedisTemplate` explicitly when you need `SET` with NX/PX or scan-unfriendly large collections.

Read Spring Data Redis' cache chapter and then add jitter to TTLs on your hottest keys. Cache-aside is correct and incomplete. The incomplete part is always the herd and the eviction.
