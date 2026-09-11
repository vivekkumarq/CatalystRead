---
title: "Scaling Django and Python to Hundreds of Millions of Users"
slug: "instagram-django-python-scaling-hundreds-of-millions"
description: "How Instagram kept a synchronous Django monolith running as its user base exploded from zero to hundreds of millions of accounts."
publishedAt: "2025-05-14"
category: "Instagram"
tags:
  - Engineering at Scale
  - Instagram
  - Django
  - Python
  - PostgreSQL
sources:
  - title: "What Powers Instagram: Hundreds of Instances, Dozens of Technologies"
    author: "Mike Krieger"
    publisher: "Instagram Engineering"
    url: "https://instagram-engineering.com"
---

When Instagram launched in October 2010, it ran on a single Amazon EC2 instance with a Django application server, a PostgreSQL database, and a handful of Python processes gluing the pieces together. Eighteen months later the service had grown to tens of millions of users, and within a few years it would cross the hundreds-of-millions mark — all while the core application remained what it had always been: a Python and Django monolith. The engineering story isn't about replacing Django with something more exotic; it's about how far disciplined operational engineering can stretch a conventional web stack before you need to reach for anything else.

## Staying synchronous, staying simple

Instagram's founding engineers made a deliberate bet: keep the request path simple and synchronous, and spend engineering effort on the infrastructure underneath rather than rewriting the application layer. Django's straightforward, batteries-included design meant new features shipped fast, and Python's readability meant a tiny team could reason about the whole codebase at once. Rather than decomposing into services early, Instagram scaled the monolith horizontally — many identical Django/Nginx/Gunicorn stacks behind load balancers, all sharing a common data tier.

The tradeoff was CPU efficiency: Python's interpreter overhead is real, and a synchronous WSGI stack burns more machine resources per request than an async or compiled alternative. Instagram's answer was to treat that as a solvable operations problem instead of a rewrite trigger — profiling hot code paths, caching aggressively, and optimizing the interpreter itself for the handful of places where overhead genuinely mattered, rather than pulling the whole stack into a different language.

## Pushing state out of the app tier

Keeping the Django tier stateless and horizontally scalable meant pushing everything else — sessions, counters, feeds, media metadata — into specialized backing stores: PostgreSQL for durable relational data, Memcached for read-through caching, and Redis for structures like sorted sets that needed to support high-throughput operations the Django ORM wasn't built for. This separation let the team scale each layer independently: adding more web workers when CPU was the bottleneck, adding more database shards when I/O was the bottleneck, and adding more cache capacity when read amplification was the bottleneck.

## Operational discipline over rewrites

A small team couldn't afford to rebuild the stack every time growth strained it, so the emphasis fell on observability and automation: consistent deployment tooling, careful capacity planning, and monitoring dashboards that made it obvious which layer was closest to falling over. That discipline is why Instagram could grow its user base by orders of magnitude without a "big rewrite" story — the architecture changed incrementally, one bottleneck at a time, while the core application code stayed recognizably the same Django project engineers had started with.

## What you can borrow

- Don't assume a popular, "boring" framework can't scale — most early scaling limits are in the data tier, not the request handler.
- Keep application servers stateless so you can scale them horizontally without coordination.
- Profile before you rewrite: a handful of hot functions in a slow language often matters more than the language choice itself.
- Invest in deployment and monitoring tooling early — it lets a small team support a system many times its size.
- Solve one bottleneck layer at a time rather than reaching for a full architectural rewrite.
