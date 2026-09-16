---
title: "The Browser Rendering Pipeline: Layout, Paint, and Composite"
slug: "browser-rendering-pipeline-layout-paint-composite"
description: "A walkthrough of how browsers turn a style change into pixels on screen, and why some CSS properties are far cheaper to animate than others."
publishedAt: "2026-07-14"
updatedAt: "2026-09-16"
category: "Web Development"
tags:
  - Web Performance
  - Browser Internals
  - CSS
  - Rendering
---

"Why is this animation janky" almost always traces back to which stage of the rendering pipeline a given style change has to re-run. Not every CSS property costs the same — some trigger the full pipeline from the top, others skip straight to the cheapest final stage — and knowing which is which is the difference between an animation that holds 60fps and one that visibly stutters under load.

## The stages, in order

1. **Style** — compute which CSS rules apply to each element and resolve final computed values.
2. **Layout (reflow)** — calculate the geometry: position and size of every element, given the computed styles and the content.
3. **Paint** — fill in pixels for each layer: text, colors, borders, shadows, recorded as drawing instructions.
4. **Composite** — combine painted layers into the final image, applying transforms and opacity on the GPU.

A change to `width`, `top`, or `font-size` invalidates layout, which cascades: paint and composite have to re-run too, because they depend on layout's output. A change to `transform` or `opacity` can skip layout and paint entirely and go straight to composite, because the GPU can apply those transformations to an already-painted layer without recalculating anything underneath it.

## Why transform beats top/left for animation

```css
/* triggers layout on every frame — the browser recalculates
   position and re-paints and re-composites the whole time */
.slide-in-slow {
  animation: move-left 300ms ease-out;
}
@keyframes move-left {
  from { left: 300px; }
  to { left: 0; }
}

/* composite-only — same visual result, skips layout and paint entirely */
.slide-in-fast {
  animation: move-left-transform 300ms ease-out;
}
@keyframes move-left-transform {
  from { transform: translateX(300px); }
  to { transform: translateX(0); }
}
```

The visual output is identical. The cost is not — `left` forces the browser to redo geometry for every affected element on every animation frame, while `transform` is handled almost entirely by the compositor thread, which keeps running smoothly even if the main thread is busy with JavaScript.

## Forcing a layer with will-change

Promoting an element to its own compositor layer ahead of time avoids a layer-creation cost mid-animation:

```css
.modal-content {
  will-change: transform, opacity;
}
```

Use this sparingly — every promoted layer consumes GPU memory, and applying `will-change` broadly (or leaving it on indefinitely rather than toggling it around the actual animation) can degrade performance instead of improving it, especially on memory-constrained mobile devices.

## Layout thrashing: the JavaScript-side trap

Reading a layout-dependent property (`offsetHeight`, `getBoundingClientRect()`) immediately after writing a style forces the browser to synchronously recalculate layout right then, rather than batching it with the next natural frame:

```javascript
// forces layout recalculation on every iteration — classic thrashing
elements.forEach(el => {
  el.style.width = someValue + 'px';
  console.log(el.offsetHeight); // forces synchronous layout here
});
```

Batch all reads before all writes to let the browser compute layout once instead of once per element:

```javascript
const heights = elements.map(el => el.offsetHeight); // all reads first
elements.forEach((el, i) => { el.style.width = heights[i] + 'px'; }); // then all writes
```

## Measuring which stage is actually the bottleneck

The Performance panel in Chrome DevTools color-codes each stage — purple for layout, green for paint, and a distinct compositor track — directly in the flame chart. When frames are dropping, that's the first place to look before guessing; it tells you definitively whether the cost is layout thrashing, expensive paint (large shadows, filters), or something on the main thread blocking composite from running at all.

## A worked example

A sticky header with `transform: translateY` on scroll stays on the compositor if you only change transform/opacity. Changing `top` or `height` on each scroll forces layout. DevTools Performance: purple layout bars vs green paint vs composite. You replace `offsetHeight` reads in a loop (forced sync layout) with one read.

`will-change: transform` on the animated node, not on `body`.

## Failure modes

Reading layout then writing in a loop. Animating `box-shadow` on a huge layer. Too many layers (memory). `filter` on a parent forcing a huge paint. Intersection observers that mutate layout of all items. SVG filters on scroll.

Blaming React for layout thrash caused by CSS.

## When this is the wrong tool

The pipeline model will not fix a 4 MB image. Do not promote every element to a layer. Canvas/WebGL have a different path. If the cost is JS (JSON parse), rendering is not the first profile. Print stylesheets and accessibility zoom change the rules. Micro-optimizing composite for a static article is wasted time.
