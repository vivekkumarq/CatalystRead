---
title: "RxJS-to-Signals Interop: Using toSignal and toObservable Correctly"
slug: "angular-rxjs-signals-interop"
description: "Practical rules for crossing the boundary between RxJS observables and Angular signals without introducing timing bugs or memory leaks."
publishedAt: "2026-06-22"
category: "Angular"
tags:
  - Angular
  - RxJS
  - Signals
  - TypeScript
---

Most Angular codebases now run signals for local component state and RxJS for anything that looks like a stream — WebSocket messages, router events, form value changes with debouncing. The friction shows up at the seams. `toSignal()` and `toObservable()` exist specifically to let you cross that boundary without hand-rolling subscription management, but both have sharp edges that aren't obvious from the API surface alone.

## toSignal: reading a stream synchronously

`toSignal()` subscribes to an observable and exposes its latest emission as a signal, unsubscribing automatically when the injection context is destroyed. The catch is the initial value: signals must always have one, but an observable might not emit synchronously.

```typescript
import { toSignal } from '@angular/core/rxjs-interop';

export class PriceTickerComponent {
  private priceService = inject(PriceService);

  // price$ is cold and only emits after a network round trip
  price = toSignal(this.priceService.price$, { initialValue: null });
}
```

Without `initialValue`, `toSignal` returns `undefined` until the first emission, which forces every consumer to null-check even before you've decided that's meaningful. Set it explicitly, and prefer a sentinel like `null` over `undefined` so "no value yet" is distinguishable from "field genuinely absent" further down the chain.

For observables that are guaranteed to be synchronous — a `BehaviorSubject`-backed store, for instance — use `requireSync: true` instead. It's a compile-time contract that fails loudly at runtime if the assumption breaks, rather than silently propagating `undefined`.

## toObservable: escaping into RxJS operators

Going the other way, `toObservable()` turns a signal into an observable so you can apply operators signals don't have — `debounceTime`, `distinctUntilChanged`, `switchMap`.

```typescript
import { toObservable } from '@angular/core/rxjs-interop';
import { debounceTime, switchMap } from 'rxjs';

searchTerm = signal('');

results = toSignal(
  toObservable(this.searchTerm).pipe(
    debounceTime(300),
    switchMap(term => this.api.search(term)),
  ),
  { initialValue: [] },
);
```

This round trip — signal in, observable out, signal back in — is the idiomatic way to get debounced search with cancellation while keeping the component's public API as a plain signal. `toObservable` must be called in an injection context (constructor, field initializer, or `runInInjectionContext`), because it needs to schedule change detection under the hood via `effect()`.

## The trap: don't nest effects around toSignal

A common mistake is layering a manual `effect()` on top of a `toSignal()` result just to react to changes — that's redundant, since a signal read anywhere reactive already triggers updates. The other trap is calling `toObservable` inside a loop or a computed, creating a fresh observable (and fresh subscription) on every change detection pass:

```typescript
// wrong — creates a new observable and subscription every time this runs
effect(() => {
  toObservable(this.searchTerm).subscribe(console.log);
});
```

Create interop observables once, as class fields, and let signals do the reacting. Treat the RxJS side as the place for temporal operators and the signal side as the place for synchronous state reads — mixing those responsibilities is what makes interop code hard to reason about six months later.
