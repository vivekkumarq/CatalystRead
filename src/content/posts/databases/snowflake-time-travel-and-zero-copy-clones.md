---
title: "Snowflake Time Travel and Zero-Copy Clones, for People Who Pay for Storage"
slug: "snowflake-time-travel-and-zero-copy-clones"
description: "How micro-partitions make undrop, time travel, and clone cheap at first — and why Fail-safe plus retained history still shows up on the bill."
publishedAt: "2026-08-10"
category: "Databases"
tags:
  - Databases
  - Snowflake
  - Data Warehousing
  - Storage
sources:
  - title: "Understanding & Using Time Travel"
    publisher: "Snowflake Documentation"
    url: "https://docs.snowflake.com/en/user-guide/data-time-travel"
  - title: "Cloning Considerations"
    publisher: "Snowflake Documentation"
    url: "https://docs.snowflake.com/en/user-guide/object-clone"
---

Snowflake stores tables as immutable **micro-partitions**. A write creates new partitions rather than overwriting bytes in place. That physical choice is why **Time Travel** (query `AT` / `BEFORE` a timestamp or statement id) and **zero-copy clones** (`CREATE TABLE … CLONE`) can exist as first-class SQL instead of a weekend restore project. It is also why storage bills confuse teams who think clone means "free forever."

## Time Travel is retained metadata plus retained partitions

For a configurable retention window (often 1 day standard, up to 90 on enterprise editions for some objects), Snowflake keeps the partitions that a table needed to reconstruct older versions. `UNDROP` is the same machinery. After Time Travel expires, **Fail-safe** (for Snowflake-managed storage) keeps a non-customer-readable recovery window that only Snowflake support can use — you still pay for it in the storage model, and you cannot query it as `AT`.

```sql
SELECT * FROM orders AT (TIMESTAMP => '2026-08-10 12:00:00'::TIMESTAMP);
CREATE TABLE orders_dev CLONE orders;
```

Clones copy pointers, not bytes, at creation time. As `orders` and `orders_dev` diverge, each side keeps partitions the other no longer references. The clone becomes expensive when both sides churn. A nightly clone of a 200 TB table that then gets rewritten in QA is not a trick; it is a second table with delayed storage realization.

## What this is not

This is not application-level CDC. Time Travel is for recovery, audits of "what did this table look like," and spinning environments. It is a poor change-data-capture bus: use streams and tasks, or an external log, if you need incremental processing. It is also not a substitute for RBAC; a clone inherits structure, but you still manage who can read PII in the copy.

Transient and temporary tables have shorter or no Fail-safe; they exist to stop you from paying disaster-recovery storage for scratch data. Teams that build ETL landing tables as permanent with 90-day Time Travel discover a warehouse-sized version of git history they did not want.

## Operational habits

Set Time Travel high on gold tables you would page to restore. Set it low on raw dumps. Clone for CI and developer sandboxes, then drop clones. Monitor `TABLE_STORAGE_METRICS` (or account usage views) for `FAILSAFE_BYTES` and `TIME_TRAVEL_BYTES`, not just active bytes. A merge that rewrites every partition ages out old ones only after retention — a large `UPDATE` is a storage event.

Cross-cloud and replication features have their own copy semantics; do not assume a clone in one account is a DR plan.

Snowflake's documentation on cloning considerations is the honest page: unique keys, sequences, stages, and pipes do not all clone the way a junior engineer hopes. Read it before you script `CLONE DATABASE` as the onboarding flow.

Time Travel is a gift of immutable partitions. Treat retention as a product decision with a budget owner, not as a default left at maximum because "storage is cheap" — in a warehouse, storage is a line item that grows with every rewrite you forgot to expire.
