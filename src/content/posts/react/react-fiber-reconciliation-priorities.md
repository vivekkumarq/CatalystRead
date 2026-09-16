---
title: "React Fiber: Lanes, Priorities, and Why Reconciliation Can Pause"
slug: "react-fiber-reconciliation-priorities"
description: "Fiber as a unit of work, lanes for updates, and how concurrent rendering uses priority without dropping your state on the floor."
publishedAt: "2026-08-24"
category: "React"
tags:
  - React
  - Fiber
  - Concurrent Rendering
  - Performance
sources:
  - title: "React Fiber Architecture"
    author: "Andrew Clark"
    publisher: "GitHub notes"
    url: "https://github.com/acdlite/react-fiber-architecture"
  - title: "React 18 working group: concurrent rendering"
    publisher: "React"
    url: "https://github.com/reactwg/react-18"
---

React's old reconciler was recursive and hard to interrupt. **Fiber** (Andrew Clark's notes, then the 16+ rewrite) is a linked-tree of units of work: each component instance is a fiber with child/sibling/return pointers, pending props, and an **update queue**. The renderer can **pause** after a slice of work, yield to the browser, then resume. That is what makes concurrent rendering possible. It is not a new diff algorithm in the textbook sense; it is a scheduling rewrite of the same "compare element trees" idea.

## Lanes, not a single FIFO

Updates get **lanes** (priority bands): discrete user input higher than default transitions, which sit above idle work. `startTransition` marks updates as non-urgent so a keystroke can render before a heavy list filter. The scheduler may **render** a tree speculatively and throw it away if a higher lane arrives — hence "tearing" rules and why some reads need `useDeferredValue`.

```text
fiber A (App)
  child → fiber B (Input)  lane: discrete
  sibling → fiber C (List) lane: transition
```

You do not assign lanes in app code except through APIs (`startTransition`, `useDeferredValue`, `Suspense`). If you block the main thread in render (large JSON parse), Fiber cannot yield inside your function. Yield happens **between** fibers.

## Reconciliation still uses keys

Fiber did not retire `key`. Identity of list children still drives reuse. A paused render must not apply half a mutation to the DOM; React keeps a work-in-progress tree and **commits** in a phase that is more synchronous. Effects run after commit. If you measure DOM in render, you were always wrong; concurrent mode makes it blow up more often.

## What to do with this knowledge

Profile with the React DevTools priority lanes view when a typeahead janks. Move expensive updates into transitions. Split components so work units are small. Do not clone the Fiber data structures in your head for a todo app; do use them when a huge dashboard fights the input box.

Read Clark's Fiber architecture notes and the React 18 WG concurrent explanations. Then wrap a heavy setState in `startTransition` and feel the input. The architecture exists so that interaction can win. If everything is urgent, you rebuilt the old stack with extra trees.
