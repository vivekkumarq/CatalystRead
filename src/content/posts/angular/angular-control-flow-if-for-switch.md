---
title: "Angular's Built-in Control Flow: @if, @for, and @switch"
slug: "angular-control-flow-if-for-switch"
description: "The new block syntax replaces *ngIf and *ngFor with something faster to compile, easier to read, and harder to misuse."
publishedAt: "2026-01-12"
updatedAt: "2026-09-16"
category: "Angular"
tags:
  - Angular
  - TypeScript
  - Frontend Engineering
  - Performance
---

For years, conditional rendering in an Angular template meant reaching for `*ngIf`, `*ngFor`, and the occasional `ng-template` gymnastics for an `else` branch. The built-in control flow blocks — `@if`, `@for`, `@switch` — replace all of that with syntax that reads like the language you already know, compiles more efficiently, and no longer requires importing `CommonModule` into every standalone component.

## @if Without the ng-template Dance

The old `*ngIf`/`else` pattern needed a named template reference just to render a fallback. `@if` gives you `else` as a first-class keyword:

```typescript
@Component({
  selector: 'app-order-status',
  template: `
    @if (order().status === 'shipped') {
      <p>Your order shipped on {{ order().shippedAt | date }}.</p>
    } @else if (order().status === 'cancelled') {
      <p class="error">This order was cancelled.</p>
    } @else {
      <p>Processing — hang tight.</p>
    }
  `,
})
export class OrderStatus {
  order = input.required<Order>();
}
```

Angular narrows the type inside each branch, so if `order().status` were a discriminated union, TypeScript would know exactly which shape you're working with inside each block — something `*ngIf` templates could never do reliably.

## @for and the Mandatory track Expression

`@for` requires a `track` expression, and that requirement is the single biggest correctness improvement in this feature. `*ngFor` let you skip `trackBy` entirely, which silently meant Angular tore down and rebuilt every DOM node on each array change — losing input focus, animation state, and scroll position along the way.

```typescript
@Component({
  template: `
    @for (item of cart(); track item.id) {
      <cart-line [item]="item" />
    } @empty {
      <p>Your cart is empty.</p>
    }
  `,
})
export class CartList {
  cart = input.required<CartItem[]>();
}
```

Because `track` is required syntax, not an optional input, there's no code path where a large list quietly falls back to identity-based diffing. Inside the block you also get `$index`, `$count`, `$first`, `$last`, `$even`, and `$odd` as implicit variables — no more `let i = index` boilerplate.

The `@empty` block is the other quiet win: rendering a "no results" state used to mean a sibling `*ngIf="items.length === 0"`, duplicating the length check the `*ngFor` was already doing. Now it's one block, one source of truth.

## @switch for Exhaustive Branching

`@switch` replaces `[ngSwitch]`/`*ngSwitchCase` with the same block syntax, and it's a better fit whenever you have more than two or three mutually exclusive states:

```typescript
@Component({
  template: `
    @switch (connection().state) {
      @case ('connected') { <status-dot color="green" /> }
      @case ('connecting') { <status-dot color="amber" pulsing /> }
      @case ('error') { <status-dot color="red" /> }
      @default { <status-dot color="gray" /> }
    }
  `,
})
export class ConnectionIndicator {
  connection = input.required<Connection>();
}
```

Unlike a JavaScript `switch`, there's no fallthrough to worry about — each `@case` is its own isolated block.

## Why the Performance Story Is Real, Not Marketing

These blocks aren't directives instantiated at runtime; they're compiled directly into instructions the Angular compiler understands ahead of time. That means smaller generated code, no directive metadata lookup at render time, and — critically for `@for` — a diffing algorithm that uses your `track` key instead of falling back to array index comparisons.

## Migrating Existing Templates

Angular ships a schematic that handles the bulk of the conversion automatically:

```bash
ng generate @angular/core:control-flow
```

Run it, then read the diff carefully. The one case worth checking by hand is any `*ngFor` that relied on index-based tracking for correctness — you'll want to pick a real `track` key, usually an ID, rather than defaulting to `$index`, which reintroduces the exact bug the new syntax was designed to prevent.

## A worked example

A list uses `@for (item of items(); track item.id)` with `@empty { <p>None</p> }`. Nested `@if (item.alert())` shows a banner. `@switch (status())` maps `'ok'|'warn'|'err'` without a default that silently swallows new states — you add `@default` that logs in dev. Track by id so a reorder does not destroy inputs.

Migrate one template at a time; `*ngFor` and `@for` can coexist during the PR.

## Failure modes

`track $index` reintroduces the identity bug. `@if` with an assignment that people expect to be a field (`@if (user = auth())` is not a thing). Forgetting `@empty` and showing a blank card. `@switch` comparing objects by reference. Using `@for` on an unbounded observable-backed array that reallocates every emission without `track`.

Old structural directive microsyntax in the same view as the new control flow confusing readers.

## When this is the wrong tool

Control flow is not state management. Do not replace a stream of DOM-heavy tabs with nested `@switch` of 2,000 lines. `NgIf` else templates that are already clear can wait. The new syntax will not virtualize a 10k-row table. If you generate templates, update the generator before half-migrating by hand.
