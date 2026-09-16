---
title: "Zoneless Angular: Signals as the Notification System Change Detection Always Wanted"
slug: "angular-zoneless-and-signal-based-apps"
description: "What Zone.js was doing on every async hop, how zoneless + signals mark dirty components, and the remaining places you still need to tell Angular that data arrived."
publishedAt: "2026-09-04"
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
