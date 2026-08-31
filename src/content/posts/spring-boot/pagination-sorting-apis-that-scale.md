---
title: "Pagination and Sorting APIs That Actually Scale"
slug: "pagination-sorting-apis-that-scale"
description: "Why offset pagination falls apart under real data volume, and how to design keyset-based pagination and sorting APIs that stay fast at scale."
publishedAt: "2025-09-09"
category: "Spring Boot"
tags:
  - Spring Boot
  - REST APIs
  - SQL
  - Performance
---

Spring Data's `Pageable` makes offset pagination so easy that almost nobody questions it until a customer with a large dataset hits page 400 and the request takes eleven seconds. The mechanism behind that slowdown is worth understanding, because the fix isn't a bigger connection pool — it's a different pagination strategy.

## Why Offset Pagination Gets Slower With Every Page

`Pageable` with `PageRequest.of(400, 20)` translates into `LIMIT 20 OFFSET 8000`. The database still has to scan and discard the first 8,000 rows before it can return the 20 you asked for — offset doesn't skip work, it does the work and throws away the result. The deeper into a result set a client pages, the more rows the database walks past on every single request, even though the response size never changes.

```java
Page<Order> orders = orderRepository.findByStatus(
        OrderStatus.SHIPPED, PageRequest.of(400, 20, Sort.by("createdAt").descending()));
```

For small tables or shallow pagination (page 1 through maybe 20), this is entirely fine — the cost is negligible and the API is simple to reason about and simple for clients to consume, including "jump to page 12" style UI. The problem is specific to deep pagination over large tables, not offset pagination in general.

## Keyset Pagination: Pay a Constant Cost

Keyset (also called cursor) pagination replaces "skip this many rows" with "give me rows after this specific point," expressed as a `WHERE` clause on the sort column instead of an offset.

```sql
SELECT id, status, created_at
FROM orders
WHERE status = 'SHIPPED'
  AND (created_at, id) < (:lastCreatedAt, :lastId)
ORDER BY created_at DESC, id DESC
LIMIT 20;
```

```java
public interface OrderRepository extends JpaRepository<Order, Long> {

    @Query("""
        SELECT o FROM Order o
        WHERE o.status = :status
          AND (o.createdAt < :cursorTime
               OR (o.createdAt = :cursorTime AND o.id < :cursorId))
        ORDER BY o.createdAt DESC, o.id DESC
        """)
    List<Order> findPageAfter(OrderStatus status, Instant cursorTime, Long cursorId, Pageable pageable);
}
```

The compound `(created_at, id)` comparison — rather than sorting on `created_at` alone — exists to break ties deterministically. Without a unique tiebreaker column in the sort, two rows with an identical timestamp can be skipped or duplicated across page boundaries, which is a subtle bug that only shows up under real concurrent write volume.

With the right composite index (`(status, created_at, id)` here), this query costs roughly the same whether it's page 1 or page 4,000, because the database seeks directly to the cursor position via the index instead of scanning everything before it.

## The API Trade-Off Clients Need to Accept

Keyset pagination gives up two things offset pagination has for free: jumping directly to an arbitrary page number, and a reliable total-row count without a separate (and separately expensive) `COUNT(*)` query. Most APIs handle this by exposing a cursor-based contract explicitly rather than pretending it's still page-number pagination:

```json
{
  "data": [ { "id": 4821, "status": "SHIPPED" } ],
  "nextCursor": "eyJjcmVhdGVkQXQiOiIyMDI1LTA5LTA5VDEyOjAwOjAwWiIsImlkIjo0ODIxfQ==",
  "hasMore": true
}
```

That's a real constraint for UIs built around numbered page links, and it's worth having that conversation with API consumers early rather than discovering it after the contract has shipped. In practice, a hybrid approach works well: offer offset pagination for the first handful of pages where it's cheap and the numbered-page UX is valuable, and require or strongly steer clients toward a cursor once they're paging deep enough that the offset cost starts to matter — feed and export-style endpoints are the ones that benefit most from going straight to keyset from day one.
