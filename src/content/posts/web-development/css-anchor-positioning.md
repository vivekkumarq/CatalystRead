---
title: "CSS Anchor Positioning: Tethering UI Without a JS Measuring Loop"
slug: "css-anchor-positioning"
description: "anchor-name, position-anchor, and fallbacks: tooltips and popovers that stay attached through scroll, plus the overflow cases JS used to own."
publishedAt: "2026-09-16"
category: "Web Development"
tags:
  - Web Development
  - CSS
  - Layout
  - UI
sources:
  - title: "CSS Anchor Positioning"
    publisher: "CSSWG"
    url: "https://www.w3.org/TR/css-anchor-position-1/"
  - title: "CSS anchor positioning"
    publisher: "MDN"
    url: "https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_anchor_positioning"
---

Tooltips, dropdowns, and teaching callouts used to mean `getBoundingClientRect` in a scroll listener. **CSS Anchor Positioning** lets a positioned element declare an **anchor** (`anchor-name` on the button, `position-anchor` on the floating UI) and place itself with `anchor()` in `inset` properties. The browser keeps the relationship through scroll and layout. JavaScript remains for open/close state; it should not be the layout engine.

## Names and position-area

```css
.btn { anchor-name: --menu; }
.menu {
  position: absolute;
  position-anchor: --menu;
  position-area: bottom span-left;
}
```

`position-area` (and earlier `anchor-center` style APIs — check the shipped syntax) describe which side to sit on. **Fallbacks** (`position-try-fallbacks` / `@position-try`) flip to `top` when the viewport clips the bottom. That is the feature you used Popper.js for.

Anchors can be implicit with `anchor=""` attributes in HTML for popover APIs in some implementations. Pair with **Popover** (`popover=`) so top-layer and light dismiss work.

## What still needs JS

Overflow in a `overflow: auto` ancestor that is not the viewport can still clip; `overflow: visible` or a different containing block may be required. Shadow DOM and name lookup have spec rules; anchors may not pierce the way you hope. Dynamic anchors (virtualized lists) still need care: if the anchor unmounts, the floating element has nothing to attach to.

Browser support is rolling. Provide a JS positioning fallback for older engines, or accept that old Safari gets a static layout.

## Accessibility

Positioning is not keyboard behavior. Focus trap, aria-expanded, and Escape are still yours (or the Popover API's). A visually anchored tooltip that is not in DOM order can confuse reading sequence; prefer `popover` semantics.

Read the CSSWG draft's examples and MDN for the properties your target browsers ship. Then delete a `resize` listener that only exists to move a tooltip. If it still janks, you are measuring for a reason the CSS model doesn't cover yet — not because anchor positioning is fake. The loop was the smell.
