---
title: "Server-Side Rendering and Incremental Hydration in Angular"
slug: "angular-ssr-incremental-hydration"
description: "How Angular's SSR pipeline and incremental hydration reduce time-to-interactive by rehydrating the DOM in stages instead of all at once."
publishedAt: "2026-04-02"
updatedAt: "2026-09-16"
category: "Angular"
tags:
  - Angular
  - SSR
  - Hydration
  - Performance
---

Full hydration has always been the awkward part of Angular SSR. The server renders real HTML fast, but the client still has to walk the entire component tree, re-run change detection, and reattach every listener before the page actually responds to input. On a large dashboard that walk is expensive, and users end up staring at pixels that look interactive but aren't. Incremental hydration changes the shape of that work by tying rehydration to the same triggers that already drive deferred loading.

## Why full hydration falls short

`provideClientHydration()` alone gives you non-destructive hydration: Angular reuses the server-rendered DOM instead of tearing it down and re-rendering from scratch, which kills the layout flash you'd otherwise get. But it's still an all-or-nothing operation. Every component, including the pricing calculator nobody scrolls to, gets hydrated on load. That's wasted CPU on mobile devices where it matters most, and it directly inflates Total Blocking Time.

## Wiring up incremental hydration

Incremental hydration piggybacks on `@defer` blocks. Instead of a component hydrating eagerly, you tell Angular to hydrate it only when its defer trigger fires — `on viewport`, `on interaction`, `on idle`, or a timer.

```typescript
import { bootstrapApplication } from '@angular/platform-browser';
import { provideClientHydration, withIncrementalHydration } from '@angular/platform-browser';

bootstrapApplication(AppComponent, {
  providers: [
    provideClientHydration(withIncrementalHydration()),
  ],
});
```

```html
@defer (on viewport; hydrate on viewport) {
  <comment-thread [postId]="post.id" />
} @placeholder {
  <comment-thread-skeleton />
}
```

The `hydrate on viewport` clause is the key addition — it's separate from the defer trigger itself, so you can render eagerly on the server but hydrate lazily on the client, or use different conditions for each. A footer widget might defer-load `on idle` but only hydrate `on interaction`, since nobody needs it to be clickable until they actually click it.

## Serialization and skip hydration

Not everything should participate. Third-party widgets that manipulate the DOM directly, or components wrapping non-Angular libraries like a charting canvas, will fight with Angular's hydration diffing. Mark those with `ngSkipHydration`:

```html
<legacy-chart-widget ngSkipHydration />
```

Angular then destroys and re-renders that subtree on the client instead of trying to reconcile it, which is exactly what you want for DOM the framework doesn't control.

## Measuring the payoff

The metric that moves is Interaction to Next Paint on initial load, not LCP — LCP is usually already fine with SSR since the paint happens server-side. Instrument with `PerformanceObserver` on `event` entries, or just watch the Angular DevTools hydration overlay, which flags mismatched nodes in red. Mismatches are the real risk here: if server and client render different content for the same node — a `Date.now()` call inside a template, or content behind an `isPlatformBrowser` check — hydration falls back to full re-render for that subtree and you lose the benefit entirely. Keep template output deterministic between server and client, push browser-only logic into `afterNextRender`, and incremental hydration stays cheap instead of becoming a silent tax you never notice until a profiler shows it.

## A worked example

SSR emits HTML for the article. Hydration is deferred for comments `@defer` until viewport. The article body hydrates immediately so links work. You enable incremental hydration so untouched regions stay server HTML. A mismatch test fails CI if a `Date.now()` in the template differs server vs client — you move it to `afterNextRender`.

Transfer state for the article JSON so the client does not refetch on boot.

## Failure modes

Invalid HTML that breaks hydration. `Math.random()` in templates. Browser-only APIs in constructors. Hydrating a huge tree at once on mobile. Incremental hydration never firing because of a wrong trigger. Auth-only blocks that SSR as logged-out then hydrate as logged-in — flash and mismatch.

Caching SSR HTML that includes a user name for the wrong user.

## When this is the wrong tool

A behind-login app with no SEO need may skip SSR. Incremental hydration will not fix a 3 MB client bundle. Do not SSR canvas games. If the page is a single dashboard that is fully interactive immediately, full hydration is simpler. Static generation plus client islands may beat Angular SSR for a docs site. Skip SSR for internal admin tools.
