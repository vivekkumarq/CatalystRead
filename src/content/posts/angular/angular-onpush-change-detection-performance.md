---
title: "OnPush Change Detection: What It Actually Skips"
slug: "angular-onpush-change-detection-performance"
description: "OnPush doesn't make a component faster on its own — it changes when Angular bothers to check it at all. Understanding the difference matters."
publishedAt: "2026-04-07"
updatedAt: "2026-09-16"
category: "Angular"
tags:
  - Angular
  - Performance
  - Change Detection
  - Frontend Engineering
---

The default change detection strategy checks every component, every time, on every event Angular knows about — a click, a timer, an HTTP response. For most apps this is fine, because each check is cheap. It stops being fine once a component tree grows past a few hundred nodes and every keystroke in a search box triggers a full top-to-bottom sweep. `OnPush` is Angular's answer, and it works by narrowing exactly when a component is eligible to be checked at all.

## The Three Triggers, and Only Three

With `ChangeDetectionStrategy.OnPush`, a component is checked when, and only when, one of these happens:

1. One of its `@Input()`-bound properties receives a new reference.
2. An event originates from within the component's own template (a click handler, for instance).
3. It's explicitly marked dirty — `ChangeDetectorRef.markForCheck()`, an `AsyncPipe` receiving a new value, or a signal read in its template changing.

```typescript
@Component({
  selector: 'app-price-tag',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<span>{{ price() | currency }}</span>`,
})
export class PriceTag {
  price = input.required<number>();
}
```

If `PriceTag`'s parent re-renders but passes the exact same object reference for `price`, Angular skips this component's check entirely — not just skips updating the DOM, skips running the check in the first place. That's the performance win: fewer components visited per change detection cycle, not faster per-component checks.

## Where This Breaks: Mutation

The trigger is a **new reference**, not a changed value. Mutating an array or object in place and expecting `OnPush` to notice is the single most common bug this strategy introduces:

```typescript
// Breaks OnPush — same reference, different contents
addItem(item: CartItem) {
  this.cart.push(item); // mutation
}

// Works — new reference triggers the check
addItem(item: CartItem) {
  this.cart = [...this.cart, item];
}
```

This is exactly why immutable update patterns and `OnPush` are always discussed together — one is meaningless without the other. Teams that adopt `OnPush` without an immutability discipline usually end up sprinkling `markForCheck()` calls everywhere to compensate, which defeats most of the benefit.

## Signals Make This Automatic

Signal-based components sidestep the mutation trap for template-read state, because a signal's `set`/`update` always produces a change notification regardless of whether the underlying value is a primitive or object — and templates reading a signal register that dependency directly:

```typescript
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `@for (item of cart(); track item.id) { <cart-line [item]="item" /> }`,
})
export class CartList {
  cart = signal<CartItem[]>([]);

  addItem(item: CartItem) {
    this.cart.update(items => [...items, item]); // still needs a new array, but the signal API nudges you toward it
  }
}
```

Signals don't eliminate the need for immutable updates on the array itself, but they do eliminate an entire other bug class: forgetting to call `markForCheck()` after mutating component state from outside Angular's zone (a WebSocket callback, a third-party library's callback).

## Measuring Before Committing

`OnPush` is not free to introduce — it changes behavior, and applying it broadly across an app that relies on mutation patterns will produce visible bugs (stale UI) before it produces a measurable performance win. Use Angular DevTools' profiler to find components that show up frequently in change detection cycles despite rarely changing visually; those are the actual candidates. A component that already re-renders rarely, or one whose render is trivially cheap, gains nothing from `OnPush` beyond one more thing to get wrong.

## The Practical Default for 2026

For new components built with signal inputs (`input()`) and `signal()`/`computed()` for state, `OnPush` is close to free — the mutation trap mostly doesn't apply because the signal APIs push you toward immutable updates by construction. Set it as the default in new code, and treat retrofitting it onto older, mutation-heavy components as a deliberate refactor, not a drive-by optimization.

## A worked failure mode

A list is marked `OnPush`, then a parent mutates an array in place (`items.push`) and wonders why rows stay stale. A developer "fixes" it by injecting `ChangeDetectorRef` and calling `markForCheck` from a nested `setInterval`. CPU returns to Default-like levels. Another child receives a new object identity every cycle from a getter in the template, so OnPush never skips. The failure is OnPush as a flag without immutable inputs and explicit events. Pass new array references, avoid getters that allocate, and let signals or async pipes notify. Profile with Angular DevTools: skipped vs checked components, not a vibe.

## When this is the wrong tool

OnPush is the wrong first move if the template already hammers the DOM with a 10k-row unvirtualized table. It will not fix a sync JSON parse on every click. Do not sprinkle `markForCheck` until you have restored the contract. Default change detection is fine for small admin forms. Zoneless-plus-signals may be the better modern path than a sea of OnPush and manual marks. Use OnPush when inputs are stable references and you can see skipped checks in a profiler.
