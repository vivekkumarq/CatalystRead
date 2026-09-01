---
title: "Snowflake: Twitter's Decentralized, Sortable ID Generator"
slug: "twitter-snowflake-decentralized-sortable-ids"
description: "How Twitter replaced a single MySQL sequence with a decentralized ID generator that packs time, machine, and sequence into a roughly sortable 64-bit ID."
publishedAt: "2025-06-05"
category: "Twitter"
tags:
  - Engineering at Scale
  - Twitter
  - Distributed Systems
  - Databases
---

Before Snowflake, Twitter generated tweet IDs the way most growing web applications do: an auto-incrementing column in MySQL. That worked fine when there was one database, but it became untenable the moment Twitter needed to shard its tweet storage across many MySQL instances. A single auto-increment sequence is inherently a single point of coordination — every ID assignment has to go through it — which makes it a bottleneck and a single point of failure exactly when you're trying to shard specifically to remove those things. Twitter needed a way to generate unique IDs from many independent processes, with no coordination between them on a per-ID basis, while still preserving a property that mattered enormously for a product built around a reverse-chronological timeline: IDs needed to be roughly sortable by creation time, so that "give me the next page of tweets" could be a cheap range query instead of an expensive lookup.

## Packing time, machine, and sequence into 64 bits

Snowflake's answer was to generate IDs as 64-bit integers assembled from three components: a timestamp (milliseconds since a custom epoch), a machine or worker identifier, and a per-machine sequence number that increments for IDs generated within the same millisecond. Because the timestamp occupies the highest-order bits, IDs generated later are numerically larger than IDs generated earlier — sortable by creation time without needing to look anything up — while the machine ID and sequence number guarantee that two different Snowflake workers, or two calls to the same worker within the same millisecond, never collide.

```
64-bit ID layout (conceptual):
[ 1 unused bit ][ 41 bits: timestamp ][ 10 bits: worker id ][ 12 bits: sequence ]
```

This meant ID generation could be fully decentralized: any number of Snowflake worker processes could mint IDs independently, in parallel, with no communication between them and no shared sequence to coordinate through. The only coordination required was a one-time assignment of distinct worker IDs, handled through ZooKeeper, so that two workers never accidentally claimed the same machine ID.

## Why not just use a UUID

A natural question is why Twitter didn't simply use UUIDs, which solve the uniqueness and decentralization problem too. The answer was sortability and size: standard UUIDs are randomly distributed and carry no time ordering, which would have made "get tweets after this point in time" — the single most common access pattern in a timeline product — an expensive operation instead of a cheap range scan on a sorted key. UUIDs are also 128 bits, twice the size of a Snowflake ID, which matters when the identifier is embedded in essentially every piece of data flowing through the system, indexed in databases, and passed around in URLs and API responses at Twitter's volume.

## Clock dependence as the real operational challenge

Snowflake's design does introduce a real operational constraint: because the timestamp component depends on each worker's system clock, correctness depends on clocks not jumping backwards. If a worker's clock is set backwards — through misconfiguration or a bad NTP correction — it needs to either wait or refuse to generate IDs until the clock catches back up, to avoid producing an ID that's numerically smaller than one it already generated. This makes reliable time synchronization and clock-skew handling a first-class operational concern rather than an afterthought, and it's a pattern that recurs in essentially every clock-embedded ID scheme that's followed since.

## What you can borrow

- When a single auto-increment sequence becomes your bottleneck, embedding a coarse ordering signal (like a timestamp) directly in a decentralized ID is often better than giving up on ordering entirely.
- Decentralized ID generation only needs a one-time, low-frequency coordination step (assigning worker IDs) rather than per-ID coordination — design for that distinction explicitly.
- Choose ID size and structure based on your dominant access pattern, not just uniqueness guarantees — sortability by time is often worth far more than the extra entropy of a full UUID.
- If correctness depends on clock monotonicity, treat clock skew as a first-class failure mode with explicit handling, not an edge case you'll deal with if it ever comes up.
