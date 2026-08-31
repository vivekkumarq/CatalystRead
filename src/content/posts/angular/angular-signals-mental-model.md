---
title: "A Mental Model for Angular Signals"
slug: "angular-signals-mental-model"
description: "Signals are not just a new API — they change how change detection works. Here is the model that makes signal, computed, and effect click."
publishedAt: "2026-08-18"
category: "Angular"
tags:
  - Angular
  - Signals
  - TypeScript
  - Frontend Engineering
featured: true
featuredOrder: 2
---

Angular's signals are easy to use and easy to misunderstand. The API is three functions — `signal`, `computed`, `effect` — but the interesting part is the *graph* those functions build, and what that graph means for change detection.

## A Signal Is a Node, Not a Variable

A signal is a container that knows two things: its current value, and **who read it**. Reading a signal inside a reactive context registers a dependency edge; writing to a signal marks every dependent as stale.

```typescript
import { computed, signal } from '@angular/core';

const cart = signal<CartItem[]>([]);

const itemCount = computed(() => cart().length);

const shipping = computed(() => (subtotal() > 50 ? 0 : 4.99));

const subtotal = computed(() =>
  cart().reduce((sum, item) => sum + item.price * item.quantity, 0),
);
```

Calling `cart.set(...)` does not "run" anything. It marks `itemCount`, `subtotal`, and transitively `shipping` as *possibly dirty*. The recomputation happens lazily — only when someone reads them again, and only if their inputs actually changed. Unread computeds cost nothing.

## Computed Values Are Pull-Based

This laziness is the property people miss. A `computed` is not a subscription that fires on every write; it is a memoized function that pulls fresh values on demand:

- If nothing reads `shipping()`, it never recomputes.
- If `cart` changes but `subtotal` produces the same number, `shipping` sees an unchanged input and skips recomputation entirely (signals use referential equality by default — configurable with `equal`).

The result is glitch-free consistency: you can never observe `itemCount() === 3` while `subtotal()` still reflects two items.

## Effects Are the Escape Hatch, Not the Pattern

An `effect` runs when its dependencies change — which makes it tempting to use for everything. Resist that. Effects are for synchronizing signals with the *outside world*: localStorage, analytics, the DOM, a chart library.

```typescript
import { Component, effect, inject } from '@angular/core';

@Component({ /* ... */ })
export class ThemePanel {
  private readonly theme = inject(ThemeService);

  constructor() {
    effect(() => {
      document.documentElement.classList.toggle('dark', this.theme.isDark());
    });
  }
}
```

If you find yourself writing an effect that sets another signal, you almost always want a `computed` instead. Deriving state with effects reintroduces the ordering and timing bugs signals were designed to eliminate.

## What This Means for Change Detection

In a zoneless application the framework no longer guesses when to check your components — the signal graph tells it precisely. When a signal read by a template changes, that component (and only that component) is scheduled for refresh.

The practical consequences:

1. **Templates should read signals directly.** The template read is the dependency registration.
2. **Prefer `input()` and `model()`** signal-based inputs, so the graph extends across component boundaries.
3. **Immutable updates matter.** `cart.update(items => [...items, next])` changes the reference; mutating the array in place does not, and nothing will refresh.

## Migrating Thinking, Not Just Code

Coming from RxJS, the instinct is to translate: `BehaviorSubject` becomes `signal`, `map` becomes `computed`, `subscribe` becomes `effect`. The first two translations are good; the third is a smell. Most `subscribe` calls in components exist to copy stream values into fields for the template — with signals, the template reads the source directly and the copy disappears.

RxJS still owns the asynchronous domain: debounced searches, websockets, retries, cancellation. Signals own synchronous derived state. `toSignal` and `toObservable` bridge the two worlds cleanly at the boundary.

Keep the graph in your head — values pulling from values, with effects only at the edges — and every signals API decision becomes predictable.
