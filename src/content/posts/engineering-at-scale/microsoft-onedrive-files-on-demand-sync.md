---
title: "Files On-Demand: OneDrive's Trick for Making a Cloud Namespace Look Local"
slug: "microsoft-onedrive-files-on-demand-sync"
description: "How OneDrive placeholders, reparse points, and a cloud filter driver let Windows show entire libraries without downloading every byte."
publishedAt: "2026-09-30"
updatedAt: "2026-09-30"
category: "Microsoft"
tags:
  - Engineering at Scale
  - Microsoft
  - Storage
  - Sync
sources:
  - title: "OneDrive Files On-Demand"
    publisher: "Microsoft Support"
    url: "https://support.microsoft.com/en-us/office/learn-about-files-on-demand-3d3a351e-d7c1-4e32-9b37-a3b0a4f4e0e5"
  - title: "Cloud Filter API"
    publisher: "Microsoft Learn"
    url: "https://learn.microsoft.com/en-us/windows/win32/cfapi/cloud-files-api-portal"
---

Sync clients used to have a simple, terrible default: if the user has 1 TB in the cloud, download 1 TB, or make them pick folders. Laptops do not have 1 TB free, and users do not know which folders they will open next quarter. OneDrive Files On-Demand, built on Windows Cloud Filter (the Cloud Files API), represents remote files as local placeholders. Explorer shows name, size, and a status icon. Opening the file hydrates content from the cloud. Unpinning dehydrates it again. The namespace is complete; the disk is not.

## Placeholders are a filesystem fiction that must not leak

A placeholder is not a zero-byte toy. Applications call `CreateFile`, memory-map, and expect `ERROR_SUCCESS`. The filter driver intercepts reads, asks the OneDrive service to fetch blocks, and only then satisfies the IRP. If hydration is slow, the app sees a slow disk, not a custom OneDrive error — unless the fetch fails, in which case the driver must return a coherent NTSTATUS. Office, Photo viewers, and backup tools all exercise different paths (opportunistic locks, memory-mapped IO, directory enumeration). Microsoft's Cloud Filter API exists because doing this in a user-mode sync loop with SMB-like fakery was a compatibility nightmare.

Status icons (cloud-only, locally available, always keep on device) are user-facing contracts that map to pin states. "Always keep on device" is a durability request: the file should survive offline. Teams that implement "on-demand" without a pin that actually bypasses eviction will lose the CFO's deck on an airplane. Eviction policy is a product: least-recently-used among unpinned files, with safeguards so Windows updates and the OS disk do not starve.

## Sync, conflicts, and the hydration stampede

Files On-Demand does not remove the hard sync problems: concurrent edits, deleted-on-server vs. dirty-local, and permission changes. It adds a new one: *hydration storms*. A poorly written antivirus or desktop search indexer that opens every file in a library will pull the entire cloud onto disk and saturate WAN. OneDrive has had to coordinate with Windows Search and Defender so those agents understand placeholders and do not treat them as ordinary resident files. Any ISV that copies "cloud files" without a similar exemption list will recreate the storm.

Partial hydration (block-level) matters for large media. Downloading a 4 GB video to seek the first 10 seconds is a bad default. The Cloud Files API supports ranges; the service and cache must be aligned or you pay full-object GET prices on S3-style backends. Hashing and version IDs remain the source of truth: a placeholder that hydrates v3 while the user thought they had v2 is a silent overwrite waiting to happen. Conflict copies, not last-writer-wins without notice, are how Office-shaped products stay trusted.

The mid-size steal is not a Windows driver. It is the product split: enumerate cheap metadata for the whole tree, fetch bytes on first real use, let the user pin, and teach every scanner on the machine about the placeholder type. Without that last step, on-demand is a self-DoS.

## What you can borrow

- Separate namespace listing from blob download; users navigate trees they do not fully materialize.
- Implement an explicit pin/offline contract; eviction must not touch pinned files.
- Block or educate full-tree scanners (backup, AV, search) so they do not hydrate everything.
- Hydrate by range for large objects; version tokens must match between placeholder metadata and GET.
- Surface conflicts as extra files or UI, not as silent cloud last-write-wins on user documents.
