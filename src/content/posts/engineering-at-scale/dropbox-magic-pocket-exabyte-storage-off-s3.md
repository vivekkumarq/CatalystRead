---
title: "Magic Pocket: Moving Exabytes Off S3"
slug: "dropbox-magic-pocket-exabyte-storage-off-s3"
description: "How Dropbox built Magic Pocket, its own exabyte-scale storage system, and migrated hundreds of petabytes of user data off S3 without downtime."
publishedAt: "2025-05-14"
updatedAt: "2026-09-16"
category: "Dropbox"
tags:
  - Engineering at Scale
  - Dropbox
  - Storage
  - Infrastructure
sources:
  - title: "Inside the Magic Pocket"
    publisher: "Dropbox Tech Blog"
    url: "https://dropbox.tech"
---

For its first several years, Dropbox stored customer files the way most fast-growing startups did: on Amazon S3. That was the right call early on — nobody wants to build a storage system while also trying to find product-market fit. But Dropbox's workload was unusual. It was storing and serving an enormous, ever-growing pile of largely-unchanging file blocks, at a scale heading toward exabytes, and paying S3's per-gigabyte rates on all of it. At that size, owning the hardware and writing the storage layer yourself stops being a distraction and starts being one of the most consequential engineering and financial decisions the company can make.

## Why leave a managed service at that scale

The economics were the headline reason: at exabyte scale, the gap between what a cloud storage provider charges and what raw disk, network, and data-center capacity actually costs is enormous, and it compounds every month. But cost wasn't the only driver. Owning the storage stack also meant Dropbox could tune every layer — disk density, erasure coding, network topology between racks — specifically for its access patterns, rather than for a generic multi-tenant cloud product. That level of control isn't available to a tenant of someone else's storage service, no matter how large.

## What Magic Pocket actually is

Magic Pocket is Dropbox's custom-built, exabyte-scale block storage system, running across its own data centers on hardware Dropbox specified. Files are broken into blocks, and each block is stored with erasure coding rather than simple replication — spreading data and parity fragments across many disks and machines so that any single disk, machine, or even rack failure can be tolerated and repaired without data loss, while using meaningfully less raw capacity than keeping multiple full copies would. A separate index layer tracks where every block lives, so the system can find, heal, and rebalance data across an enormous and constantly churning fleet of disks.

The system was built with the explicit goal of "zero data loss," which shaped nearly every design decision — from how aggressively it scrubs disks for silent corruption to how it verifies data on every write and periodically thereafter.

## Migrating without anyone noticing

The harder problem than building Magic Pocket was moving hundreds of petabytes of live, actively-read-and-written user data out of S3 and into it without downtime, without data loss, and largely without users noticing. Dropbox couldn't simply flip a switch — the migration ran incrementally, copying and verifying data in the background while the service kept serving live traffic, with the ability to fall back if anything looked wrong. That kind of migration is as much an exercise in operational discipline and verification tooling as it is in storage engineering: every block had to be checksummed and cross-checked, and the team had to be confident in the new system's failure behavior before cutting traffic over for good.

## The payoff

Once complete, Magic Pocket gave Dropbox a storage substrate purpose-built for its workload, at a fraction of the cost of continuing to rent equivalent capacity from a cloud provider. It also became the foundation the rest of Dropbox's infrastructure was built on top of — everything from sync to search ultimately reads and writes blocks through Magic Pocket. The project is frequently cited in the industry as one of the largest live storage migrations ever undertaken, and it set the template Dropbox has followed since: build the layer that's core to the business and genuinely differentiated, and keep renting the layers that aren't.

## What broke when they scaled

S3 is an extraordinary default until the bill and the request mix of "exabytes of mostly cold user files" dominate the company. Dropbox's Magic Pocket story is about building a custom storage stack (erasure coding, disk-heavy servers, their own replication) because at that scale they could beat general-purpose object storage on cost while keeping durability. The break of staying on S3 was economic and architectural: every GET/PUT pattern of a desktop sync product is not the same as a typical AWS customer's, and they had enough volume to amortize a storage team.

Migration without downtime means dual-read/dual-write or a pointer-flip per object after copy, with checksums, and a long tail of rarely accessed blobs you still must move. Durability during the copy is a new failure mode: two systems must agree what the source of truth is. Magic Pocket also had to match S3's operational bar — repair, bitrot, disk failure as a daily event — which is S3's eleven-nines lesson applied in-house.

They did not leave AWS entirely; they left the storage layer they could economically own.

## A smaller-team version of the same idea

Stay on S3/GCS until storage is a top cost line *and* you have a team that can run disks. Then consider cheaper classes (Glacier, Archive) and lifecycle rules before you design erasure coding. If you must self-host, start with replication factor 3 and checksums, not a novel code. Object-rename as a pointer is easier than rewriting clients.

## What you can borrow

- Re-evaluate build-vs-buy as scale changes — a decision that was correct at one order of magnitude of data can become expensive at the next.
- Erasure coding is a legitimate way to cut storage overhead versus naive replication once you're operating at a scale where the engineering investment pays for itself.
- Large migrations succeed on verification and rollback capability, not just on the destination system being "ready" — build the ability to compare and fall back before you need it.
- Migrate incrementally against live traffic rather than attempting a cutover; the safety net matters more than the speed of the move.
- Owning your core infrastructure is worth the investment only when that layer is truly central to your product and differentiated from what a vendor offers everyone else.
