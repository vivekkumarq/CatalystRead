---
title: "Eleven Nines: What Amazon S3 Actually Promises About Durability"
slug: "amazon-s3-eleven-nines-durability"
description: "What Amazon S3's famous '99.999999999% durability' figure actually means statistically, and the engineering that backs the promise."
publishedAt: "2025-05-19"
category: "Amazon"
tags:
  - Engineering at Scale
  - Amazon
  - Storage
  - Reliability
sources:
  - title: "Reliability, constant work, and a good cup of coffee"
    author: "Colm MacCárthaigh"
    publisher: "Amazon Builders' Library"
    url: "https://aws.amazon.com/builders-library/"
---

Amazon S3's marketing copy has long advertised "eleven nines" of durability — 99.999999999% — a number so extreme it's easy to read past without registering what it's actually claiming. It doesn't mean S3 is up 99.999999999% of the time; that's availability, a separate and much less extreme guarantee S3 states independently. Durability is about whether a specific object you stored is still recoverable, bit for bit, at some point in the future. The eleven-nines figure means that if you store ten million objects, you'd expect, on average, to lose one of them roughly every ten thousand years. Getting a number that extreme to mean anything requires treating data loss as a problem to be engineered out at the storage-system level, not something to patch over with alerting after the fact.

## Redundancy is necessary but not sufficient

The obvious first move is redundancy: S3 stores object data redundantly across multiple devices and multiple Availability Zones, so that the loss of a single disk, rack, or even an entire data center doesn't lose the object. But redundancy alone doesn't get you to eleven nines. Devices don't only fail catastrophically and all at once — they also fail quietly. A hard drive can return the wrong bits without reporting an error, a bit can flip in memory, a network segment can silently corrupt a packet. If you only check data integrity when a customer happens to read an object back, you can go a very long time without discovering that a replica has silently degraded, and by the time you notice, other replicas of the same data might have degraded too.

## Constant work: check everything, all the time, regardless of load

The engineering principle that closes that gap, described in the Amazon Builders' Library, is what AWS calls "constant work." Rather than scaling verification effort up and down with how busy the system happens to be, S3 continuously runs background integrity checks against every stored object, checksumming and comparing replicas against each other regardless of whether anyone is actively reading that data. The workload of "verify everything is still correct" stays roughly constant whether the system is idle or under heavy load, which is a deliberate design choice: systems whose safety-critical work scales with traffic tend to under-invest in that work precisely when things are already stressed, which is exactly the wrong time to skip it. When constant background scanning finds a corrupted or missing replica, S3 repairs it automatically by regenerating it from other healthy copies, well before a customer would ever notice.

## Checksums end to end, not just at rest

Durability also depends on catching corruption in transit, not only at rest. S3 computes and verifies checksums at multiple points as data moves through the system — on the way in, across internal replication, and again during background verification — so that a bit flip introduced anywhere along the path gets caught by the next checksum comparison rather than silently propagating into a "durable" copy that's already wrong. Combined with erasure coding techniques for some storage classes, which let S3 reconstruct an object from a subset of its encoded pieces rather than needing a full, intact replica, the system has multiple independent ways to detect and recover from partial data loss.

## What eleven nines really buys you

The statistical framing matters because it reframes durability as an actuarial property of the whole system rather than a promise about any single object. No individual disk or server is eleven-nines reliable — commodity hardware fails constantly at Amazon's scale. The eleven nines emerges from redundancy plus continuous, load-independent verification plus automated repair, applied uniformly across an enormous number of objects, so that the rare failures that do slip through are caught and corrected before they compound into permanent loss.

## What you can borrow

- Separate durability (will the data survive) from availability (can you reach it right now) in your own SLAs — they require different engineering and shouldn't be conflated.
- Don't rely on redundancy alone; add active, continuous integrity checking that runs regardless of read traffic, so silent corruption doesn't accumulate undetected.
- Apply the "constant work" principle broadly: safety-critical background work should run at a steady rate, not scale down under load when it's needed most.
- Checksum data at every boundary it crosses — ingestion, replication, and storage — not just once at the edges of your system.
