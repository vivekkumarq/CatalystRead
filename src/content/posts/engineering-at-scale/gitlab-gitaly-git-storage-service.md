---
title: "Gitaly: Git Storage as an RPC Service Instead of NFS on a Prayer"
slug: "gitlab-gitaly-git-storage-service"
description: "How GitLab extracted Git disk operations into Gitaly so the Rails app no longer spoke filesystem paths to a shared NFS server."
publishedAt: "2026-11-17"
updatedAt: "2026-11-17"
category: "GitLab"
tags:
  - Engineering at Scale
  - GitLab
  - Storage
  - Distributed Systems
sources:
  - title: "Gitaly"
    publisher: "GitLab"
    url: "https://docs.gitlab.com/administration/gitaly/"
  - title: "Praefect and Gitaly Cluster"
    publisher: "GitLab"
    url: "https://docs.gitlab.com/administration/gitaly/praefect/"
---

GitLab's application used to treat repositories as directories on a disk the Rails nodes could all see. That is a natural design when you are a single box. At the scale of GitLab.com it became a distributed systems accident: NFS, locking, a Git process storm on the file server, and a failure domain where "disk is slow" meant every clone, fetch, and merge request page was slow. Gitaly is GitLab's answer: stop talking to Git through a filesystem mount, and start talking through an RPC service that owns the disk.

## One hop to a process that may run Git

Gitaly exposes RPCs for the operations GitLab actually needs — fetch, receive-pack, blame, commit walks, housekeeping — rather than exporting a POSIX filesystem. Workhorse and Rails become clients. The Git binary and the object database live next to Gitaly, which can pack, garbage-collect, and rate-limit with knowledge of Git's on-disk layout. That is a better API than `open()` on a packed-refs file from five application servers at once.

N+1 access patterns that were invisible on a local SSD become visible as RPC chatter. Gitaly work included batching and caching because a merge request page that asked for commit messages one RPC at a time would never be fast. The extraction forced GitLab to notice how chatty a Git web UI is.

## Replication is not NFS

A single Gitaly node is still a single disk. Gitaly Cluster with Praefect introduced a router and replica set so a repository can live on multiple Gitaly nodes, with a primary for writes. That is closer to a database failover story than to a clustered filesystem. Split brain, stale replicas, and "which node has the newest refs" become explicit. Disk failure no longer has to mean restore-from-backup as the only path, but you pay for it in replication lag and in operational complexity that NFS pretended not to have.

Repository sharding — assigning projects to shards or storage names — existed before fancy clustering. It is still the practical lever: do not put every customer on one node because the average repo is small. The tail is a monorepo that is not small.

## Failure modes of Git-as-a-service

The concrete failure is housekeeping (repack, git-gc) colliding with a burst of fetches on a huge repository, pegging IOPS, and looking like a total GitLab outage from the user's point of view. Mid-size steal: isolate elephant repos, schedule maintenance, and cap concurrent RPCs per repository.

Operational gotcha: Praefect's database is now in the Git path. If the router cannot decide a primary, pushes fail in a way NFS never failed — they fail closed, which is better than silent split brain and worse if you have not practiced failover. Another is treating Gitaly like a stateless pod in Kubernetes without persistent disks that actually persist. Snapshot backups of the data directory while Git is receiving a pack is how you back up corruption. Use the backup tooling that understands Git, or quiesce. Hooks that call out to slow HTTP from inside a receive-pack RPC will block pushes for everyone on that node. Keep hooks short or async. If you still have NFS in the diagram "temporarily," you still have the old outage class. Finish the cutover or admit you run NFS.

## What you can borrow

- Wrap a specialized disk format (Git, or your own) in an RPC service instead of sharing it over NFS from app nodes.
- Measure chatty call patterns when you extract; the filesystem hid N+1.
- Shard by repository size and traffic, not by equal project counts.
- Replication of Git needs an explicit primary and backup protocol, not a clustered filesystem as wishful thinking.
