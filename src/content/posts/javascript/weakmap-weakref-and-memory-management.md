---
title: "WeakMap, WeakRef, and Getting Serious About Memory"
slug: "weakmap-weakref-and-memory-management"
description: "How WeakMap, WeakRef, and FinalizationRegistry actually work, where each one earns its place, and why most of them belong in library code, not app code."
publishedAt: "2025-11-16"
category: "JavaScript"
tags:
  - Memory Management
  - JavaScript
  - Performance
  - Node.js
---

Most memory leaks in long-running JavaScript apps aren't exotic. They're a `Map` that keys on objects and never evicts entries, an event listener attached to a DOM node that outlives the node's removal from the page, or a cache that grows forever because nobody wrote the eviction logic. `WeakMap` and its relatives exist specifically to make an entire category of these leaks structurally impossible, rather than something you have to remember to clean up.

## Why WeakMap instead of Map

A regular `Map` holds a strong reference to every key. If you use an object as a key, that object cannot be garbage collected as long as the `Map` exists, even if nothing else in your program references it. For a cache that's supposed to be tied to an object's lifetime — say, storing computed metadata about a DOM element or a request context — that's backwards. `WeakMap` holds its keys weakly: once nothing else references the key object, the entry is eligible for collection along with it.

```javascript
const metadataCache = new WeakMap();

function getMetadata(element) {
  if (!metadataCache.has(element)) {
    metadataCache.set(element, computeExpensiveMetadata(element));
  }
  return metadataCache.get(element);
}

// When `element` is removed from the DOM and has no other references,
// its entry in metadataCache disappears too — no manual cleanup needed.
```

This is also the standard pattern for simulating private fields before native `#field` syntax existed, and it's still useful for attaching data to objects you don't control — third-party class instances, DOM nodes, or objects passed in by a plugin API — without polluting the object itself or leaking memory.

The tradeoff is that `WeakMap` isn't iterable and has no `size`. That's not an oversight — if you could enumerate its keys, you'd be able to observe garbage collection timing, which the spec deliberately prevents. If you need to iterate, you need a regular `Map` and an eviction strategy.

## WeakRef and FinalizationRegistry: rarely the right tool

`WeakRef` lets you hold a reference to an object without preventing its collection, and `FinalizationRegistry` lets you register a callback to run after an object is collected. They sound like exactly what you'd want for advanced caching, but in practice they're a trap for most application code.

```javascript
const registry = new FinalizationRegistry((heldValue) => {
  console.log(`cleaned up: ${heldValue}`);
});

let obj = { data: "large payload" };
registry.register(obj, "obj-label");
obj = null; // eligible for GC, callback may run — eventually, or maybe not soon
```

The callback timing is entirely up to the engine. It might run milliseconds after collection or it might not run before the process exits. You cannot use it for anything time-sensitive — closing a file handle, releasing a lock, flushing a buffer — because "eventually, maybe" isn't a contract you can build correctness on. The TC39 spec explicitly recommends against relying on finalizers for program logic. The legitimate use cases are narrow: instrumentation and debugging tools that want to detect leaks, or low-level library code managing external resources (WASM memory, native handles) where an *eventual* cleanup is a safety net on top of explicit disposal, not a replacement for it.

## The actual leak checklist

Before reaching for any of these APIs, check the boring stuff first: event listeners not removed on teardown, `setInterval` timers never cleared, closures capturing large objects in a scope that outlives its usefulness, and caches without a size cap or TTL. `WeakMap` solves the "cache keyed by object identity" leak specifically. It won't save you from the other three.
