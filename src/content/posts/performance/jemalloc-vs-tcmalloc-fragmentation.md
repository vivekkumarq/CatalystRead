---
title: "jemalloc vs tcmalloc: Fragmentation, Arenas, and the Allocator You Inherited"
slug: "jemalloc-vs-tcmalloc-fragmentation"
description: "Why long-lived services bloat RSS, how arenas and size classes work, and when switching allocators is a real lever versus a blog meme."
publishedAt: "2026-08-20"
category: "Performance"
tags:
  - Performance
  - Memory
  - Linux
  - Allocators
sources:
  - title: "jemalloc"
    publisher: "jemalloc.net"
    url: "https://jemalloc.net/"
  - title: "tcmalloc"
    publisher: "Google"
    url: "https://github.com/google/tcmalloc"
---

glibc `malloc` is fine until a long-running C++/Rust service's RSS grows without a matching live-set. **Fragmentation**: free lists that cannot satisfy the next size class, arenas that never give pages back, and contention on a global lock. **jemalloc** (Facebook/Meta lineage, used by FreeBSD and many runtimes) and **tcmalloc** (Google) are thread-caching allocators with size classes, per-thread caches, and explicit tunables for decay (returning memory to the OS).

## Arenas and caches

Both keep **thread-local caches** to avoid locking on every `free`. jemalloc's arenas scale with threads; too many arenas can waste memory, too few can contend. `MALLOC_CONF=background_thread:true,dirty_decay_ms:…` (jemalloc) controls how fast dirty pages return. tcmalloc has similar knobs (`TCMALLOC_*`, per-CPU caches in newer versions). A spike in allocation rate without decay looks like a leak in Grafana.

```text
size classes: 8, 16, 32, ... 
thread cache → arena → mmap pages
decay: madvise(DONTNEED) over time
```

Java people: the JVM uses its own heap; this article is for native heaps (Envoy, Redis, Python extensions, JNI). Mixing jemalloc under a JVM can still help **native** allocations (direct buffers, zlib) if you `LD_PRELOAD` carefully — measure, don't cargo-cult.

## How to choose

Profile with allocator stats (`malloc_stats_print`, tcmalloc pprof). If fragmentation ratio (RSS / live) is high after a load spike, try jemalloc with more aggressive decay, or tcmalloc, on a canary. If the live set actually grew, you have a leak; allocators will not save you. glibc has improved; on some distros the gap is smaller than a 2015 blog post.

Huge pages, `MADV_HUGEPAGE`, and container memory limits interact: the allocator can hold dirty pages that the OOM killer counts. Set decay when you run on tight cgroups.

## Process

`LD_PRELOAD` in one replica, same workload, compare RSS and latency. Watch for crashes from mixed allocators (`free` from the wrong library). Build against one allocator in the image rather than hoping preload order.

Read jemalloc's tuning guide and tcmalloc's design README. Then dump stats from production before you rewrite a cache. Fragmentation is a graph of RSS versus live bytes. If you never plotted live bytes, you are guessing.
