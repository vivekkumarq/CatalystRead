---
title: "Hunting Memory Leaks with Heap Dumps"
slug: "hunting-memory-leaks-with-heap-dumps"
description: "A Java memory leak is always a reachability bug. Heap dumps let you find exactly which reference is holding on, instead of guessing at flags."
publishedAt: "2025-07-17"
category: "Java"
tags:
  - Java
  - Memory Leaks
  - Heap Dumps
  - Debugging
---

A Java "memory leak" is a specific, well-defined thing: an object that's no longer needed but is still reachable from a GC root, so the collector correctly refuses to reclaim it. There's no equivalent of C's dangling pointer or forgotten `free` — everything traces back to some live reference chain, which is actually good news, because it means every leak is findable with the right tool, not a matter of luck.

## Capturing a Heap Dump

You can trigger a dump from a running process without a restart, using `jcmd` or `jmap`:

```
jcmd <pid> GC.heap_dump /tmp/app-heap.hprof
```

For crash diagnosis after an actual `OutOfMemoryError`, configure the JVM to dump automatically at the moment of failure — this is worth having on in production by default, since the dump captures the exact state that caused the crash, which you can never perfectly reproduce after the fact:

```
-XX:+HeapDumpOnOutOfMemoryError
-XX:HeapDumpPath=/var/dumps/
```

For an actual leak (as opposed to a single OOM event), the useful technique is taking two dumps under similar load, separated by enough time for the leak to grow visibly, then comparing them — a class whose instance count grows steadily between the two dumps while everything else stays flat is your prime suspect.

## Reading a Dump: Dominators, Not Just Counts

Opening a heap dump in Eclipse Memory Analyzer (MAT) or JDK Mission Control, the instinct is to sort by instance count and look at the biggest number. That's a reasonable start, but the more precise tool is the **dominator tree** — it shows, for each object, how much *total* memory would be freed if that object became unreachable, which accounts for everything it retains underneath it.

```
Leak Suspects Report (MAT):
  1 instance of "com.example.cache.SessionCache" occupies 340 MB (72% of heap)
    - retains 890,000 instances of "com.example.model.UserSession"
```

A single `SessionCache` instance retaining 340MB tells a precise story on its own: something is putting entries into this cache and never removing them. MAT's "Leak Suspects" report automates exactly this pattern — it looks for objects with disproportionately large retained size relative to the rest of the heap and reports them directly, which is usually the fastest path to a diagnosis.

## The GC Roots Path Is the Actual Answer

Once you've found the object retaining too much memory, the real question is *why is it still reachable at all* — and the answer is the path from that object back to a GC root:

```java
public class SessionCache {
    // Grows forever: nothing ever removes an entry, and this is a static field —
    // reachable for the entire lifetime of the classloader that defines it
    private static final Map<String, UserSession> CACHE = new HashMap<>();

    public void put(String id, UserSession session) {
        CACHE.put(id, session);
    }
}
```

"Merge Shortest Paths to GC Roots" in MAT shows exactly this: `SessionCache.CACHE` → static field → GC root, with the `HashMap`'s bucket array and every entry in between listed as retaining that path. Once you see the field, the fix is almost always obvious — either bound the cache with an eviction policy (`Caffeine`, an LRU wrapper, a TTL), or explicitly remove entries when their logical lifetime ends.

## Common Leak Patterns to Recognize

| Pattern | Symptom in dump |
| --- | --- |
| Unbounded static cache/map | One class dominates retained size, growing over time |
| Listener registered but never removed | Many instances of a listener interface, retained by the publisher |
| `ThreadLocal` never cleared | Retained by thread objects, especially visible in pooled-thread apps |
| Inner class holding an outer reference longer than needed | Outer class instances retained via synthetic `this$0` field |

Heap dump analysis has a reputation for being intimidating, but the actual workflow is short: find the dominator with the disproportionate retained size, trace its path to a GC root, and you're looking at the exact line of code responsible. The hard part is remembering to capture the dump before restarting the leaking process — a restart resets the leak, and the evidence, back to zero.
