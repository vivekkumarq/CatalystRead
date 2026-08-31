---
title: "The View Transitions API: Native Animation Between States"
slug: "view-transitions-api-guide"
description: "Smooth page and state transitions used to require a JavaScript animation library and careful DOM choreography. The View Transitions API does it natively."
publishedAt: "2026-02-27"
category: "Web Development"
tags:
  - Web Development
  - CSS
  - Animation
  - Frontend Engineering
trending: true
---

Animating between two UI states — a list item expanding into a detail view, a full page navigation, a theme toggle sweeping across the screen — used to mean capturing a "before" snapshot, applying the DOM change, measuring the "after" state, and animating between the two by hand, usually with a library shouldering that coordination. The View Transitions API moves that entire choreography into the browser: you make the DOM change, and the browser captures both states and animates between them for you.

## The Core API, Same-Document

```javascript
function updateFilter(newFilter) {
  if (!document.startViewTransition) {
    applyFilter(newFilter); // fallback for unsupported browsers
    return;
  }

  document.startViewTransition(() => {
    applyFilter(newFilter); // any synchronous DOM update
  });
}
```

`startViewTransition` takes a callback, snapshots the DOM before running it, lets the callback make whatever changes it wants, snapshots the DOM again, and cross-fades between the two snapshots by default — no configuration required for a basic transition. The feature-detection check matters: this API isn't universal yet, and the fallback is simply applying the change with no transition, which degrades gracefully rather than breaking.

## Naming Elements for Targeted Transitions

A blanket cross-fade is the default, but the more compelling use case is animating a *specific* element smoothly from one position and size to another — a thumbnail expanding into a full detail view. That's controlled with `view-transition-name`:

```css
.product-thumbnail {
  view-transition-name: product-hero;
}

.product-detail-image {
  view-transition-name: product-hero;
}
```

When both elements share a `view-transition-name` and one is being swapped for the other inside a `startViewTransition` callback, the browser doesn't cross-fade — it morphs: interpolating position, size, and (where geometry allows) shape between the two, producing the "shared element transition" effect seen in native mobile apps, achieved here with two CSS declarations and no JavaScript animation code.

## Customizing the Animation

The browser generates pseudo-elements you can target directly with standard CSS animation properties, replacing the default cross-fade with anything you want:

```css
::view-transition-old(product-hero) {
  animation: 200ms ease-out both fade-out;
}

::view-transition-new(product-hero) {
  animation: 300ms ease-out both slide-in;
}

@keyframes slide-in {
  from { transform: translateY(20px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}
```

`::view-transition-old` and `::view-transition-new` are pseudo-elements representing the before and after snapshots for a given `view-transition-name` — style them like any other animated element, with full access to `animation`, `transition`, and `transform`.

## Cross-Document Transitions

The same mechanism now extends across full page navigations within the same origin, not just single-page-app state changes — the piece that makes this relevant to sites that aren't SPAs at all:

```css
@view-transition {
  navigation: auto;
}
```

Add that one at-rule to a page's CSS, and standard link navigations between pages on the site get an automatic cross-fade transition, with the same `view-transition-name` mechanism available for matching elements — a header logo or a hero image — across the two separately-loaded documents.

## Respecting Reduced Motion

A transition system is also a motion system, and it inherits the same obligation as any other animation:

```css
@media (prefers-reduced-motion: reduce) {
  ::view-transition-group(*),
  ::view-transition-old(*),
  ::view-transition-new(*) {
    animation: none !important;
  }
}
```

Users with `prefers-reduced-motion: reduce` set should see the state change happen instantly, not a slower or smaller version of the same animation — this override is not optional polish, it's the same accessibility requirement that applies to any other CSS animation.

## Where It Actually Fits

Reach for this on state changes that benefit from spatial continuity — filtering a grid, expanding a card, switching tabs, navigating between a list and a detail page — where showing the relationship between old and new state genuinely helps the user track what happened. It's a poor fit forced onto every DOM update indiscriminately; a transition on content that has no meaningful before/after relationship just adds latency to the interaction for no comprehension benefit.
