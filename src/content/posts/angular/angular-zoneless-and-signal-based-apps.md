---
title: "Zoneless Angular: Signals as the Notification System Change Detection Always Wanted"
slug: "angular-zoneless-and-signal-based-apps"
description: "What Zone.js was doing on every async hop, how zoneless + signals mark dirty components, and the remaining places you still need to tell Angular that data arrived."
publishedAt: "2026-09-04"
updatedAt: "2026-09-16"
category: "Angular"
tags:
  - Angular
  - Signals
  - Change Detection
  - Performance
---

Zone.js patched timers, promises, and DOM events so Angular could run change detection after *anything* async. That made demos easy and production profiles noisy: a third-party widget's `setInterval` could scan a large component tree. Zoneless mode drops the monkey-patch. Updates propagate because you used signals, `OnPush` + `markForCheck`, or an explicit notification — not because a zone microtask ran.

## What actually marks a view dirty

A signal write notifies consumers. A template that read `user()` during the last CD cycle is a consumer. When `user.set` happens, Angular schedules change detection for that view (and children that need it), not the entire app. That is the same idea as fine-grained libraries, implemented inside Angular's view graph.

```typescript
component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `{{ name() }} — {{ ticks() }}`,
})
export class Badge {
  name = input.required<string>();
  ticks = signal(0);
}
```

If `ticks` updates, this badge refreshes. A sibling that never read `ticks` does not. Zone-based Default CD would have been willing to check both after any patched event.

## The leftover manual cases

- **Mutable objects updated in place** without a signal or new reference: OnPush will not see it. Replace the object or use a signal.
- **RxJS** that is not bound through `async` pipe or `toSignal`: subscribe and set a signal in the callback, or you will wonder why the UI is stale.
- **Canvas / non-Angular DOM** libraries: they never went through CD anyway. Keep them isolated.

`provideZonelessChangeDetection()` is not a free "make it faster" switch if your app still mutates fields on Default components and relies on zones. You will skip CD and show yesterday's data. Migrate by making the tree OnPush and pushing state through signals, then turn zoneless on and watch for tests that expected a `setTimeout` to magically refresh the DOM.

## Tests and fakeAsync

A lot of specs were secretly testing Zone's clocks. Zoneless tests need `whenStable` / fixture `detectChanges` after signal writes. That is more honest, not more annoying: you were always depending on a global patch.

The destination is an app whose profiler shows CD aligned with actual state changes. Signals are the API. Zoneless is the runtime that stops lying about why CD ran.

## A worked example

A widget polls a price every two seconds with `setInterval` and writes `this.price = n` on a Default-strategy component. Under Zone.js the tree refreshes. After `provideZonelessChangeDetection()`, the template stays stale. The fix is a signal:

```typescript
price = signal<number | null>(null);
ngOnInit() {
  this.id = setInterval(() => {
    this.price.set(readTicker());
  }, 2000);
}
```

The template reads `price()`. A sibling `LastUpdated` that does not read `price` stays idle. In a spec, call `fixture.detectChanges()` after the signal write; do not wrap the test in `fakeAsync` expecting Zone to flush CD.

For an RxJS websocket, `toSignal(messages$, { initialValue: null })` is the bridge. Mutating `this.user.name = x` without a new object or signal write remains invisible.

## Failure modes

Third-party charts that update canvas from their own timers will look "fine" while Angular bindings next to them are stale — two clocks. Tests that `tick()` and assert DOM without `whenStable` flap. Mixing Default and OnPush parents can hide a zoneless miss until you promote the parent. `markForCheck` called from outside NgZone used to work because Zone patched the event; zoneless needs an Angular-aware notification.

`effect()` that writes a signal unconditionally creates a loop. `untracked` exists for a reason.

## When this is the wrong tool

Do not flip zoneless on a NgModules-era app whose CD strategy is Default everywhere and whose third-party suite assumes Zone. Migrate OnPush + signals first. Zoneless is the wrong tool to "speed up" a page whose cost is a 4 MB bundle or a slow API. If you only have a handful of components, Zone.js noise may be cheaper than a migration. Server-side rendering still needs a coherent hydration story; zoneless does not replace incremental hydration work.

## Review checklist

- Tree is OnPush and state flows through signals before zoneless is enabled.
- RxJS lands in `toSignal` or `async` pipe; in-place mutation is gone.
- Specs use `whenStable` / `detectChanges` after writes, not Zone clocks.
- Profiler CD lines up with signal writes, not with third-party timers.
