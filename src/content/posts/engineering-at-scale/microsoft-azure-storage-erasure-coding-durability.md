---
title: "Cheaper Than Triple Replication: Erasure Coding in Windows Azure Storage"
slug: "microsoft-azure-storage-erasure-coding-durability"
description: "How Microsoft replaced three full copies of blob data with a local reconstruction code that keeps durability high without tripling disk."
publishedAt: "2026-09-21"
updatedAt: "2026-09-21"
category: "Microsoft"
tags:
  - Engineering at Scale
  - Microsoft
  - Storage
  - Reliability
sources:
  - title: "Erasure Coding in Windows Azure Storage"
    author: "Cheng Huang et al."
    publisher: "USENIX ATC 2012"
    url: "https://www.usenix.org/conference/atc12/technical-sessions/presentation/huang"
  - title: "Windows Azure Storage: A Highly Available Cloud Storage Service with Strong Consistency"
    author: "Calder et al."
    publisher: "SOSP 2011"
    url: "https://dl.acm.org/doi/10.1145/2043556.2043571"
---

Cloud object storage is a durability product first and a capacity product second. If a disk, rack, or datacenter fails, customer blobs still have to reconstruct. The obvious way to buy durability is replication: keep three full copies, lose one or two, keep serving. Triple replication works, and Windows Azure Storage used it, but the cost is brutal at exabyte scale — every petabyte of customer data consumes three petabytes of disk, plus the network to keep copies in sync. Microsoft's 2012 USENIX ATC paper described how Azure Storage moved a large fraction of that data onto erasure coding, specifically a *local reconstruction code* (LRC) designed so that typical failures can be repaired by reading only a few fragments instead of an entire stripe.

## Replication's bill and coding's catch

Erasure coding splits a blob into *k* data fragments and computes *n − k* parity fragments so that any *k* of the *n* pieces can rebuild the original. Reed–Solomon codes are the textbook choice. They are storage-efficient: a 6+3 scheme stores 1.5× the original instead of 3×. The catch is reconstruction cost. When a single disk dies, a Reed–Solomon decoder often needs *k* fragments to rebuild one missing piece. At Azure's density, that "small" repair becomes a cluster-wide read storm: many nodes ship data, disks that were healthy become busy, and the window during which a second failure would be fatal stays open longer than operators like.

Azure's engineers treated reconstruction bandwidth as a first-class SLO, not an afterthought. They wanted the storage savings of coding without turning every disk failure into a *k*-wide shuffle. That constraint, more than the algebra, is what produced LRC.

## Local reconstruction instead of a global decode

LRC groups data fragments into local groups, each with a local parity, and adds a smaller number of global parities. A single-disk failure inside a group can be rebuilt from the other fragments in that group plus the local parity — a handful of reads — without touching the rest of the stripe. Only rarer multi-failure patterns fall back to the more expensive global reconstruction. The paper reports that this design cut reconstruction cost dramatically versus a comparable Reed–Solomon layout while keeping durability in the same astronomical range that triple replication had advertised (many nines, with the remaining risk dominated by correlated failures and operational error, not independent disk MTTF).

Coding is not applied blindly to every byte. Hot, newly written, or small objects still prefer replication because the CPU and metadata overhead of striping tiny blobs is wasted, and because the first minutes after a write are when you most want a simple extra copy. Azure Storage's earlier SOSP paper already described a stamped, partitioned architecture with a stream layer and an object layer; erasure coding sits in that stack as a storage-efficiency stage once data is sealed and cold enough to pay the encode cost. Operators still have to place fragments with failure-domain awareness — different disks, racks, and if the product promises it, buildings — or the math assumes independence that the datacenter does not provide.

The operational failure mode is a "silent" reconstruction backlog: disks fail faster than the repair worker can finish, especially if the worker shares disks with customer traffic. LRC helps because each typical repair is cheap, but it does not help if placement packed too many fragments of the same stripe onto one rack, or if a software bug corrupts parity and the system only discovers it on a later read. Periodic scrubbing — reading fragments and checking they still match the code — is part of the durability story that customers never see on a pricing page.

## What you can borrow

- Treat repair bandwidth and repair time as durability inputs, not as background jobs you hope finish overnight.
- Prefer codes (or layouts) that reconstruct common single failures from a local subset of fragments; save global decode for rare cases.
- Keep replication for fresh and tiny objects; encode only once data is sealed and large enough to amortize striping.
- Place fragments across independent failure domains, then verify placement with chaos that actually kills racks, not just processes.
- Scrub stored parities on a schedule. Durability claims die when latent bit rot meets the first real disk loss.
