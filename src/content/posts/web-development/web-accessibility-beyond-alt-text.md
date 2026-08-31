---
title: "Accessibility Beyond Alt Text: What Actually Blocks Real Users"
slug: "web-accessibility-beyond-alt-text"
description: "Alt attributes are the easy 10% of accessibility work. Focus management, semantic structure, and keyboard flow are where most sites actually fail."
publishedAt: "2026-01-30"
category: "Web Development"
tags:
  - Web Development
  - Accessibility
  - HTML
  - Frontend Engineering
---

Alt text is the accessibility fix everyone knows about, which is exactly why it's rarely what's actually blocking a screen reader or keyboard user on a modern site. The failures that matter more, and get fixed far less often, live in focus management, semantic structure, and the assumption that a mouse is available at all.

## Focus Management Is Where Interactive UI Actually Breaks

Opening a modal with JavaScript and leaving focus wherever it happened to be is the single most common accessibility failure on sites that otherwise "pass" an automated audit — automated tools can't detect that focus never moved into the dialog, because nothing about that is a markup violation.

```javascript
function openModal(modalEl, triggerEl) {
  const previouslyFocused = triggerEl;
  modalEl.showModal(); // native <dialog>, or manage focus manually for a div-based modal

  const firstFocusable = modalEl.querySelector('button, [href], input, [tabindex]:not([tabindex="-1"])');
  firstFocusable?.focus();

  modalEl.addEventListener('close', () => {
    previouslyFocused.focus(); // return focus on close, don't strand it
  });
}
```

The native `<dialog>` element handles a surprising amount of this for free — focus trapping, `Escape` to close, and the top layer for stacking — which is why reaching for it instead of a `div` with `role="dialog"` bolted on eliminates a category of hand-rolled bugs. Building a custom overlay doesn't change the requirements: move focus in on open, trap it within the dialog, and restore it to the trigger on close.

## Semantic Structure Is Navigation, Not Decoration

A screen reader user doesn't read a page top to bottom the way a sighted user scans it — they navigate by landmark and heading, jumping directly to the region or section they want. A page built entirely from `<div>`s with visual styling but no semantic structure removes that navigation entirely, even if every individual element has a perfectly reasonable `aria-label`.

```html
<header>
  <nav aria-label="Main">…</nav>
</header>
<main>
  <h1>Order History</h1>
  <section aria-labelledby="pending-heading">
    <h2 id="pending-heading">Pending Orders</h2>
  </section>
  <section aria-labelledby="completed-heading">
    <h2 id="completed-heading">Completed Orders</h2>
  </section>
</main>
```

This costs nothing visually — every one of these elements can be styled identically to a `<div>` — but it gives assistive technology a document outline to navigate by, the same way a sighted user visually scans for a bolded section heading.

## Keyboard Flow: Test by Unplugging Your Mouse

The fastest accessibility audit that costs zero tooling is disconnecting your mouse and trying to complete a core task — adding an item to a cart, submitting a form, dismissing a notification — using only `Tab`, `Shift+Tab`, `Enter`, and `Escape`. Two failures show up almost immediately on most sites: a custom-styled control (a `div` acting as a button) that never receives focus at all, and a focus order that doesn't match visual order because of CSS positioning tricks.

```html
<!-- Fails: div is not in the tab order, has no keyboard activation -->
<div class="btn" onclick="submit()">Submit</div>

<!-- Works: native button, focusable and activatable by default -->
<button class="btn" onclick="submit()">Submit</button>
```

A `<div onclick>` needs `tabindex="0"`, a `role="button"`, and manual `keydown` handling for `Enter`/`Space` just to match what a native `<button>` gives you automatically — the actual argument for semantic HTML over generic elements with ARIA bolted on: less code, fewer chances to miss a case.

## Color Contrast and Motion, Not Just Color Blindness

WCAG contrast ratios (4.5:1 for normal text, 3:1 for large text) catch more than color-blind users — low-contrast gray-on-white text fails for anyone in bright sunlight, on a low-quality display, or simply reading tired. `prefers-reduced-motion` deserves the same default-on treatment as contrast checking:

```css
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

## Automated Tools Catch a Third of the Problem

Axe, Lighthouse's accessibility audit, and similar tools reliably catch missing alt text, insufficient contrast, and missing form labels — genuinely useful, but by their own documentation's estimate, they catch roughly a third of WCAG success criteria. Focus order, whether a modal actually traps focus, whether an error message is announced to a screen reader — none of that is detectable by static analysis. Manual keyboard testing and, ideally, testing with an actual screen reader (VoiceOver on macOS, NVDA on Windows, both free) remain the only way to catch the failures that block real users most.
