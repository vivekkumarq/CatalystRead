---
title: "Browser Memory Profiling and Leak Hunting"
slug: "browser-memory-profiling-and-leak-hunting"
description: "A practical workflow for finding and fixing JavaScript memory leaks in browser apps using heap snapshots, detached DOM detection, and retainer analysis."
publishedAt: "2026-02-18"
category: "Performance"
tags:
  - Performance
  - Frontend Engineering
  - Debugging
  - JavaScript
---

Memory leaks in browser apps rarely announce themselves. Users don't file a ticket titled "heap grew 40MB over an hour" — they just report that the tab got sluggish or crashed after being open all day. By the time it's visible, the leak has usually been there for months, quietly retaining detached DOM nodes or closures nobody remembers writing.

## Taking and comparing heap snapshots

The core workflow in Chrome DevTools' Memory panel is comparative: take a snapshot, perform an action repeatedly (open and close a modal, navigate between two routes, mount and unmount a component), take another snapshot, and diff them. A healthy app returns close to its baseline after the action completes and garbage collection runs. A leaking one shows objects accumulating with each cycle.

The "Comparison" view between two snapshots surfaces objects allocated between them that weren't freed. Sort by retained size, not shallow size — a small object holding a reference to a large subtree is often the actual leak, even though its own footprint looks negligible.

## Detached DOM nodes

The most common frontend leak is a detached DOM node kept alive by a JavaScript reference after it's been removed from the document. This happens constantly with event listeners: attach a listener to an element, remove the element from the DOM, but never call `removeEventListener` or unmount the framework component that owns the reference — the listener's closure keeps the whole node graph alive.

```javascript
class Widget {
  constructor(el) {
    this.el = el;
    this.handler = () => this.onResize();
    window.addEventListener('resize', this.handler);
  }

  destroy() {
    // Without this, `this` (and everything it references,
    // including this.el) is retained by the window listener forever.
    window.removeEventListener('resize', this.handler);
  }
}
```

In the heap snapshot, filter by "Detached" to find DOM nodes with no place in the live document tree that are still retained. The retainer tree below each one shows exactly what's holding it — usually an event listener, a closure captured in a timer, or a cache keyed by element reference that never evicts.

## Common leak sources beyond listeners

Global caches and singletons that grow unbounded are a frequent culprit — a `Map` used for memoization that's never cleared, keyed by request parameters that are different every time. Timers and intervals started with `setInterval` and never cleared on component teardown keep their entire closure scope alive indefinitely. Subscriptions to observables, WebSocket message handlers, and third-party SDK callbacks are easy to register and easy to forget to tear down, especially in single-page apps where components mount and unmount repeatedly without a full page reload to reset everything.

## A repeatable hunting process

Reproduce the suspected leak with a tight, repeatable action loop rather than general app usage — leaks are much easier to spot as a clear staircase pattern in the memory timeline than as noise in normal browsing. Force garbage collection before each snapshot (DevTools has a GC button) so you're comparing genuinely unreachable memory being retained, not just objects awaiting the next collection cycle. Use the allocation timeline recording for leaks that build up gradually over many actions rather than a single repeated one, since it shows exactly which call stack allocated memory that persisted past its expected lifetime. Fix one leak at a time and re-run the comparison — leaks compound, and fixing the biggest retainer sometimes exposes a smaller one that was previously hidden in its shadow.
