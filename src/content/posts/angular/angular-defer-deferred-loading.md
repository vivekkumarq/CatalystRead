---
title: "@defer: Lazy-Loading Angular Templates Without the Boilerplate"
slug: "angular-defer-deferred-loading"
description: "The @defer block turns lazy loading from a routing-level decision into a template-level one, with triggers that fit real UI patterns."
publishedAt: "2026-01-27"
category: "Angular"
tags:
  - Angular
  - Performance
  - Lazy Loading
  - Frontend Engineering
---

Lazy loading in Angular used to stop at the route boundary — you'd split a feature module off into its own chunk, and that was the extent of your control. Anything inside a route, no matter how heavy, shipped in the initial bundle for that page. `@defer` moves that decision down to individual template regions, with a syntax that reads like the trigger you actually want.

## The Basic Shape

```typescript
@Component({
  selector: 'app-product-page',
  template: `
    <product-summary [product]="product()" />

    @defer (on viewport) {
      <product-reviews [productId]="product().id" />
    } @placeholder {
      <div class="reviews-skeleton"></div>
    } @loading (minimum 200ms) {
      <spinner />
    } @error {
      <p>Couldn't load reviews. <button (click)="retry()">Retry</button></p>
    }
  `,
})
export class ProductPage {
  product = input.required<Product>();
}
```

The component inside a `@defer` block — and everything it imports — is split into a separate chunk at build time. Nothing about `ProductReviews` ships to the browser until the trigger fires. This is the part that makes `@defer` more than syntactic sugar: it's a genuine code-splitting boundary, not just a rendering delay.

## Triggers That Match Real UI Patterns

The trigger vocabulary covers the cases that actually come up in product work:

- `on idle` — fires when the browser is idle (the default if you omit a trigger).
- `on viewport` — fires when the block scrolls into view, ideal for below-the-fold content like reviews or related products.
- `on interaction` — fires on click or keydown, perfect for a comments section nobody reads until they click "show comments."
- `on hover` — prefetch-on-intent for things like a preview card.
- `on timer(2s)` — fires after a fixed delay.
- `when someCondition()` — a custom boolean expression, including a signal.

You can combine triggers, and you can also declare a `prefetch` trigger separately from the render trigger — so the chunk downloads on `hover` but only renders `on interaction`, hiding network latency behind user intent:

```typescript
@defer (on interaction; prefetch on hover) {
  <heavy-chart [data]="data()" />
} @placeholder {
  <button>Show chart</button>
}
```

## Placeholder, Loading, and Error Are Not Optional Polish

Each sub-block maps to a real UX state that used to require manual signal juggling: `@placeholder` is what renders before the trigger fires, `@loading` covers the fetch window (with `minimum` and `after` timing hints to avoid a flash of spinner on fast connections), and `@error` handles a failed chunk load — something that previously meant wrapping a dynamic import in try/catch by hand.

```typescript
@defer (on viewport; prefetch on idle) {
  <analytics-widget />
} @placeholder (minimum 500ms) {
  <widget-skeleton />
}
```

The `minimum` on `@placeholder` prevents a skeleton from flickering in and out if the real content resolves almost instantly — a detail most hand-rolled lazy-loading implementations skip entirely.

## Where This Actually Moves the Needle

The obvious win is initial bundle size on content-heavy pages — dashboards with widgets nobody scrolls to, product pages with reviews and Q&A sections below the fold, admin panels with rarely-used advanced settings. Less obvious: `@defer` also improves Largest Contentful Paint indirectly, because the main thread isn't parsing and evaluating JavaScript for components that aren't visible yet.

The failure mode to watch for is deferring something above the fold or something the user needs immediately — a `@defer (on interaction)` around a form's submit button, for instance, adds a chunk-load delay to an action the user is actively trying to complete. Treat `@defer` as a tool for content that is genuinely optional at first paint, not a default wrapper for anything that feels big.
