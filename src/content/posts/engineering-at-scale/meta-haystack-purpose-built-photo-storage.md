---
title: "Haystack: Why Facebook Threw Out Filesystems for Photo Storage"
slug: "meta-haystack-purpose-built-photo-storage"
description: "How Facebook's Haystack replaced a filesystem-per-photo approach with a purpose-built object store to eliminate the metadata bottleneck of billions of images."
publishedAt: "2025-09-01"
category: "Meta"
tags:
  - Engineering at Scale
  - Meta
  - Storage
  - Distributed Systems
---

In the mid-2000s, Facebook stored photos the obvious way: on NFS-mounted commodity file servers, one file per photo, fronted by a caching tier and a CDN for the popular ones. That worked while photo volume was modest. As Facebook's user base and photo uploads exploded — described in Facebook's own engineering writing as growing into the tens of billions of images, each stored at several resolutions — this straightforward approach started falling over for a specific, unglamorous reason: metadata.

## The metadata bottleneck

Traditional filesystems are built to handle general-purpose workloads: directories, permissions, arbitrary file sizes, frequent modification. None of that generality is useful for photo storage, where files are written once, read very often, and never modified. But you pay for that generality anyway. Each file on a typical filesystem carries enough metadata — inode information, directory entries — that just reading a photo could require several disk I/O operations solely to resolve the filesystem metadata, before a single byte of the actual image was read. At Facebook's scale, most of those photos were "long-tail" content — not the handful of viral images cached everywhere, but the billions of everyday photos still occasionally requested, meaning the caching tier couldn't absorb the problem away. Each of those long-tail reads was paying multiple disk seeks just for metadata, and disk seeks were the scarce resource.

## Haystack's answer: fewer, bigger files

Facebook's fix, described in a 2010 engineering paper, was Haystack: instead of one filesystem file per photo, Haystack packs many photos into a small number of large physical files (called haystacks), and keeps a compact in-memory index mapping each photo's ID to its offset and size within the right physical file. Reading a photo becomes one disk seek to the correct offset, because the metadata needed to find it lives in memory rather than requiring a filesystem metadata lookup on disk. This is a classic trade: give up general-purpose file semantics you don't need (arbitrary edits, fine-grained permissions) in exchange for collapsing the metadata-lookup cost that generality was causing.

## Built-in redundancy and simple operations

Haystack also folded replication and fault tolerance into the design rather than relying on the filesystem or a separate layer for it: each photo is written to multiple physical machines, and a lightweight Haystack directory service tracks which physical volume holds which photo and routes requests accordingly. Because photos are immutable once written, there's no need for complex locking or update coordination — the system only has to handle appends of new photos and occasional deletes (handled as tombstone markers rather than reclaiming space immediately), which massively simplifies the operational model compared to a general read-write storage system.

## What you can borrow

- When a general-purpose storage layer's overhead comes from features your workload never uses (fine-grained metadata, arbitrary mutation), a purpose-built format that drops those features can remove that overhead entirely rather than optimizing around it.
- Keeping the index that maps logical IDs to physical location in memory, and paying a single disk seek only for the actual data, is a pattern worth considering whenever "metadata lookup before the real read" shows up in your latency profile.
- Immutable-once-written data (photos, event logs, backups) can usually be stored far more simply than general read-write data — don't pay for update semantics you don't need.
- Batch many small objects into fewer large physical files when the small-object count, not the total bytes, is what's stressing your storage layer.
