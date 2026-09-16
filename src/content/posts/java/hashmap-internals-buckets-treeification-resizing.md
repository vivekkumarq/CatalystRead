---
title: "HashMap Internals: Buckets, Treeification, and Resizing"
slug: "hashmap-internals-buckets-treeification-resizing"
description: "HashMap's average O(1) performance depends on assumptions about hash distribution and load factor that are worth understanding before they're violated."
publishedAt: "2025-08-12"
updatedAt: "2026-09-16"
category: "Java"
tags:
  - Java
  - HashMap
  - Collections
  - Data Structures
---

`HashMap` gets treated as a black box that's "just fast," and for the vast majority of code that's a reasonable simplification. But its O(1) average-case performance rests on specific assumptions — a well-distributed hash function, a reasonable load factor, enough initial capacity — and once you understand the actual bucket structure underneath, a surprising number of "HashMap is slow" reports turn out to be one of those assumptions quietly broken.

## Buckets and Hash Spreading

Internally, `HashMap` is a `Node[]` array (the *table*), where an entry's array index is derived from its key's hash code. `hashCode()` alone isn't used directly — `HashMap` applies a spreading function first, XORing the hash with its own upper 16 bits shifted down, specifically to reduce collisions from hash codes that differ only in their high bits.

```java
static final int hash(Object key) {
    int h;
    return (key == null) ? 0 : (h = key.hashCode()) ^ (h >>> 16);
}
```

The actual bucket index is `hash & (table.length - 1)` — a bitwise AND instead of a modulo, which is why table length is always a power of two: it makes that mask operation exact and fast. Two keys landing in the same bucket form a collision, resolved by chaining — the bucket becomes a linked list of entries with that same index.

## Load Factor and Resizing

`HashMap`'s default constructor uses an initial capacity of 16 and a load factor of 0.75 — the table resizes (doubling in size) once the entry count exceeds capacity × load factor. Resizing means rehashing and reinserting every entry into a new, larger table, which is O(n) for that one operation.

```java
Map<String, Order> orders = new HashMap<>();       // resizes multiple times as it grows
Map<String, Order> ordersSized = new HashMap<>(1024); // sized up front, no resize churn
```

If you know roughly how many entries a map will hold, sizing it at construction avoids repeated resize-and-rehash cycles during a hot initialization path — a small thing individually, but a real cost in a loop that builds many maps, or one enormous map, from scratch repeatedly.

| Load factor | Trade-off |
| --- | --- |
| Lower (e.g., 0.5) | Fewer collisions, more memory used per entry |
| Default (0.75) | JDK's balance of memory and lookup speed |
| Higher (e.g., 0.9) | Less memory overhead, more collisions and longer chains |

## Treeification: The JDK 8 Safety Net

Before JDK 8, a bucket with many collisions degraded to an O(n) linked-list scan — and this was an actual, exploitable denial-of-service vector: an attacker who could control keys inserted into a server-side `HashMap` (form field names, HTTP headers) could craft values that all hash to the same bucket, turning every lookup into a linear scan.

Since JDK 8, a bucket that accumulates 8 or more entries (and the table has at least 64 buckets total) converts from a linked list to a red-black tree, dropping worst-case lookup within that bucket from O(n) to O(log n).

```java
// TREEIFY_THRESHOLD = 8 in HashMap's source
// If a single bucket's chain reaches this length, it becomes a tree node structure
```

This treeification requires the key type to be `Comparable`, or falls back to comparing by class name and identity hash as a tiebreaker if not — it's a defensive mechanism, not something application code needs to configure. It exists specifically so a poor hash function, or a hostile one, degrades gracefully instead of catastrophically.

## Why a Bad hashCode Still Hurts

Even with treeification as a safety net, a hash function that clusters most keys into a handful of buckets — as opposed to one truly malicious key set — still means most lookups traverse a tree instead of hitting a near-empty bucket directly. O(log n) is far better than O(n), but it's still worse than the O(1) a well-distributed hash gives you. This is the practical payoff of a correct, well-distributed `hashCode()`: it's not just about correctness (covered by the `equals`/`hashCode` contract), it's what keeps every bucket close to empty in the first place, which is the entire basis for `HashMap`'s average-case performance claim.

## A worked failure mode

A map is sized with `new HashMap(1_000_000)` thinking that is capacity in items; load factor still resizes. Keys are `URL` objects whose `hashCode` does DNS. Under attack, many keys collide in one bucket (pre-treeification Java) and requests spin. The failure is keys with expensive or hostile hashes and capacity folklore. Use well-distributed immutable keys, size with expected cardinality / load factor, and do not expose maps to untrusted key types.

## When this is the wrong tool

HashMap is the wrong tool for concurrent writers (`ConcurrentHashMap` or a lock). It is the wrong cache without eviction. Do not micro-tune treeification. Use it for in-thread dictionaries with decent keys.

When this pattern is stretched past its assumptions, the first outage looks like a mysterious performance cliff instead of a design limit. "HashMap Internals: Buckets, Treeification, and Resizing" fails that way when traffic mix, data shape, or team skill does not match the blog that sold the approach. Keep a kill switch: feature flag, smaller blast radius, or an older path that still works. Measure the thing the idea claims to improve, not a vanity graph. If you cannot name a workload where you would refuse to use it, you have not finished the design.
