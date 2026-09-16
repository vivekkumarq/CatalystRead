---
title: "CSS Cascade Layers: Ending Specificity Wars Without !important"
slug: "css-cascade-layers-specificity"
description: "How @layer orders unlayered CSS, utilities, and third-party sheets, and a practical layer map for a design-system-plus-app codebase."
publishedAt: "2026-09-14"
category: "Web Development"
tags:
  - Web Development
  - CSS
  - Design Systems
  - Frontend Engineering
sources:
  - title: "CSS Cascading and Inheritance Level 5"
    publisher: "W3C"
    url: "https://www.w3.org/TR/css-cascade-5/"
---

Specificity was a reasonable rule until every team owned a slice of the CSS and "just make this selector stronger" became the culture. Cascade layers (`@layer`) add an **author-controlled order** that beats specificity between layers. A `.btn` in a later layer wins over a `.header .nav .btn` in an earlier layer, without a specificity arms race.

## Unlayered CSS still wins

Declarations **not** in a layer are treated as a final implicit layer — they beat layered styles. That is the trap when you mix a layered design system with a random `<style>` in a template. Put everything in a named layer, or you will debug "why didn't my layer apply" for an afternoon.

```css
@layer reset, tokens, third-party, components, utilities, overrides;

@layer reset { /* box-sizing, margins */ }
@layer components {
  .button { padding: 0.5rem 1rem; }
}
@layer utilities {
  .p-0 { padding: 0; }
}
```

Utilities in a later layer can zero padding on a button without `!important`. Overrides are for the rare app-level exception, not for every page.

## Third-party sheets

Import Bootstrap or a date-picker into `@layer third-party` so your components layer can override it with ordinary class names. Without a layer, vendor selectors with IDs will keep winning.

`!important` still exists and still inverts the cascade in painful ways. Layers reduce how often you reach for it; they do not make important go away inside a layer.

## Migration

Start by wrapping existing files in `@layer leftover` and declare `leftover` last among app layers. New code goes into the proper layer. Shrink `leftover` over time. Shadow DOM and Tailwind's own layer system (`@layer base/components/utilities`) need a documented map so you do not nest competing orders.

If a PR adds a selector with three classes "for specificity," that is the signal to use a layer (or a utility) instead. The cascade should be an architecture, not a high-score list.
