---
title: "State Management Patterns in Modern Signal-Based Angular"
slug: "angular-signal-based-state-management"
description: "How signals change the calculus around state management in Angular, and when a plain service with writable signals is enough versus reaching for a store."
publishedAt: "2026-08-20"
updatedAt: "2026-09-16"
category: "Angular"
tags:
  - Angular
  - Signals
  - State Management
  - Architecture
---

Before signals, most Angular apps ended up with some flavor of NgRx or a service full of `BehaviorSubject`s just to get change detection to behave predictably. Signals remove a lot of that necessity — fine-grained reactivity is now built into the framework — but that also means teams are re-litigating a question that used to have one obvious answer: do you still need a store, and if so, what does it actually buy you now?

## The floor: a service with writable signals

For most feature-level state, a plain injectable service holding writable signals is enough, and it's dramatically simpler than the machinery it replaces:

```typescript
@Injectable({ providedIn: 'root' })
export class CartStore {
  private items = signal<CartItem[]>([]);

  readonly cartItems = this.items.asReadonly();
  readonly total = computed(() =>
    this.items().reduce((sum, item) => sum + item.price * item.quantity, 0)
  );
  readonly itemCount = computed(() => this.items().length);

  add(item: CartItem) {
    this.items.update(current => [...current, item]);
  }

  remove(id: string) {
    this.items.update(current => current.filter(i => i.id !== id));
  }
}
```

Exposing `asReadonly()` instead of the raw signal is the load-bearing detail here — it lets any component inject `CartStore` and read `cartItems()` reactively, while write access stays funneled through `add`/`remove`, which is where you'd add validation or logging. This gets you 90% of what a store framework gives you: single source of truth, computed derived state, and no manual subscription cleanup, since signals unsubscribe themselves when the reading context is destroyed.

## When a plain service starts to strain

The pattern breaks down once state needs things a service alone doesn't provide cleanly: time-travel debugging across a whole app, a serializable action log for support tooling, or coordinated updates across many independent slices that need to happen atomically. That's the point where `@ngrx/signals` earns its keep — it keeps the signal-based API surface but adds structure for larger state trees:

```typescript
export const CartStore = signalStore(
  { providedIn: 'root' },
  withState({ items: [] as CartItem[] }),
  withComputed(({ items }) => ({
    total: computed(() => items().reduce((sum, i) => sum + i.price * i.quantity, 0)),
  })),
  withMethods((store) => ({
    add(item: CartItem) {
      patchState(store, { items: [...store.items(), item] });
    },
  })),
);
```

Functionally this is close to the hand-rolled version, but `signalStore` standardizes the shape across a codebase — every store looks the same to a new team member, which matters more as the number of stores grows than as any single store grows.

## Don't put everything behind a store

The most common signal-era mistake is treating every piece of state as global by default. Local UI state — whether a dropdown is open, which tab is active, form-in-progress values — belongs in `signal()` calls inside the component itself, not hoisted into a shared store. Promoting state to shared scope should be a deliberate decision made when a second, unrelated component genuinely needs to read it, not a default. Signals made state management cheap enough that the discipline now has to come from where you draw the boundary, not from the tooling enforcing it for you.

## A worked example

A `CartStore` injectable holds `items = signal<Line[]>([])`, `total = computed(() => ...)`, and methods `add`, `remove` that update with immutable copies. Components inject the store and read signals in templates. For server state, the store calls `resource` or a repository, not HTTP in each component.

A test instantiates `CartStore` with a fake repo and asserts `total()` after `add`.

## Failure modes

Deep mutable updates (`items()[0].qty++`) that skip notifications. Giant stores that become god objects. Duplicating server cache in the store and in Query. Putting every local input in a global store. Effects that sync signals to `localStorage` on every keystroke without debounce.

Multiple instances of a store that should be `providedIn: 'root'` vs component-scoped — two carts.

## When this is the wrong tool

NgRx is still reasonable for event-sourced audit-heavy apps with many reducers already paid for. Do not invent a store for a widget with two signals. Signals are the wrong tool to persist a 5 MB editor document on every computed. If the team is not zoneless/OnPush, a store will not by itself fix CD. URL state belongs in the router, not a parallel store.
