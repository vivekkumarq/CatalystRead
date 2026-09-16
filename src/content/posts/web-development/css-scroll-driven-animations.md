---
title: "CSS Scroll-Driven Animations: Progress Without IntersectionObserver Glue"
slug: "css-scroll-driven-animations"
description: "animation-timeline: scroll() and view(), ranges, and how to animate on scroll without a rAF loop that fights the compositor."
publishedAt: "2026-09-17"
category: "Web Development"
tags:
  - Web Development
  - CSS
  - Animation
  - Performance
sources:
  - title: "Scroll-driven Animations"
    publisher: "CSSWG"
    url: "https://www.w3.org/TR/scroll-animations-1/"
  - title: "Scroll-driven animations"
    publisher: "MDN / web.dev"
    url: "https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_scroll-driven_animations"
---

View Transitions (covered elsewhere on this site) animate **navigation**. **Scroll-driven animations** tie a CSS animation's progress to **scroll position** or to an element's visibility in a scrollport (`view()`). Parallax, reading progress bars, and reveal-on-scroll can run on the compositor without an `IntersectionObserver` writing `--p` on every frame — if you only need what the spec offers.

## Timelines

```css
.progress {
  animation: grow linear;
  animation-timeline: scroll(root block);
}
@keyframes grow { from { transform: scaleX(0); } to { transform: scaleX(1); } }
```

`scroll()` tracks a scroller. `view()` tracks when a subject enters/exits a view. **Ranges** (`animation-range`) start the animation at `entry 0%` and end at `cover 100%` so you don't animate over the whole page when you meant "while this card is on screen."

`animation-timing-function: linear` is usually what you want; easing against a timeline is easy to make feel disconnected from the finger.

## Performance and accessibility

Prefer `transform` and `opacity`. Animating `top` or `box-shadow` on scroll is still expensive. `prefers-reduced-motion: reduce` should disable decorative parallax. A progress bar that is informational can stay.

Scroll timelines on `overflow: hidden` ancestors won't fire. Nested scrollers: name the scroller (`scroll-timeline-name`) if `nearest` is the wrong one.

## Fallback

No support: static layout, or a small observer polyfill for critical UX (not for parallax). Don't ship both a rAF loop and a CSS timeline that fight.

Read the CSSWG spec's range diagrams. Then replace a `--scroll` CSS variable updated from JS for one progress bar. If the bar is the document's reading progress, `scroll(root)` is the whole implementation. If you needed to drive a canvas, you still needed JS. Scroll-driven CSS is for CSS properties. That boundary keeps it fast.
