---
title: "CSS Container Queries: Designing Components, Not Pages"
slug: "css-container-queries"
description: "Media queries respond to the viewport. Container queries respond to the component's own box — which is what most responsive design actually needed."
publishedAt: "2026-02-13"
category: "Web Development"
tags:
  - Web Development
  - CSS
  - Responsive Design
  - Frontend Engineering
---

Media queries answer one question: how wide is the viewport? For page-level layout — should the sidebar collapse, should the nav become a hamburger — that's the right question. For a reusable component, it's frequently the wrong one, because a card component doesn't know or care how wide the browser window is; it cares how much space its parent container gave it. A card in a three-column grid and the same card as a full-width sidebar item need different internal layouts at the same viewport width. Container queries answer the question components actually have.

## Declaring a Containment Context

A container query only works inside an element explicitly marked as a query container — this is the piece people forget, and the reason a first attempt at a container query silently does nothing:

```css
.card-grid {
  container-type: inline-size;
  container-name: card-grid;
}
```

`container-type: inline-size` tells the browser to track this element's inline-axis (width, in a horizontal writing mode) size and make it queryable by descendants. Without it, `@container` rules inside have nothing to attach to.

## Querying the Container, Not the Viewport

```css
.card {
  display: flex;
  flex-direction: column;
}

@container card-grid (min-width: 480px) {
  .card {
    flex-direction: row;
    gap: 1rem;
  }
}

@container card-grid (min-width: 800px) {
  .card {
    padding: 1.5rem;
  }
  .card-title {
    font-size: 1.25rem;
  }
}
```

The same `.card` component now lays itself out based on the space actually available to it — stacked vertically in a narrow sidebar slot, laid out horizontally once its container crosses 480px, regardless of whether that happens because the viewport grew or because a grid gave it more columns. Drop this component into any layout and it adapts correctly without a single change to its CSS.

## Container Query Units

Alongside the `@container` at-rule, container query length units (`cqw`, `cqh`, `cqi`, `cqb`) let you size things relative to the container instead of the viewport — useful for typography that should scale with the component's own box:

```css
.card-title {
  font-size: clamp(1rem, 4cqi + 0.5rem, 1.5rem);
}
```

`cqi` here means "percent of the container's inline size," so this heading scales smoothly as the card's own width changes, independent of the rest of the page.

## Container Queries Don't Replace Media Queries

The two solve different layers of the same problem, and most real layouts need both: media queries decide the page-level grid (how many columns, whether the sidebar exists), container queries decide how each component fills the space that grid gives it. Reaching for a container query to control page-level structure, or a media query to control an individual component's internal layout, both produce the coupling problem container queries exist to remove — a component whose correctness depends on knowing the outer viewport width, which breaks the moment that component gets reused somewhere else.

## Style Queries: The Newer, Less-Adopted Half

Beyond size, `@container` also supports style queries — reacting to a custom property's value on the container rather than its dimensions:

```css
@container style(--theme: dark) {
  .card {
    background: #1a1a1a;
    color: #f5f5f5;
  }
}
```

This lets a component theme itself based on an ancestor's custom property without JavaScript or a class-based theming convention, though browser support and real-world adoption for style queries trail size queries by a wide margin — check current support before relying on it for anything beyond progressive enhancement.

## Where This Changes How You Build Components

The practical shift is architectural as much as syntactic: a component library built around container queries can genuinely be viewport-agnostic, tested once inside a few container widths rather than tested against every page-level breakpoint it might end up nested inside. That's the property media-query-only responsive design could never quite deliver for a true component system.
