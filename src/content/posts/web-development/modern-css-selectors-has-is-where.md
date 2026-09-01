---
title: "Modern CSS Selectors: :has(), :is(), and :where()"
slug: "modern-css-selectors-has-is-where"
description: "How :has(), :is(), and :where() let CSS express parent-based and grouped selectors that used to require JavaScript or repetitive rules."
publishedAt: "2026-08-04"
category: "Web Development"
tags:
  - CSS
  - Web Development
  - Frontend Engineering
---

For years, "style a parent based on its children" was the canonical example of something CSS simply could not do — you reached for JavaScript to add a class, every time. `:has()` closed that gap directly in the selector language, and it arrived alongside two other selectors, `:is()` and `:where()`, that solve a much more mundane but equally common problem: repetitive, hard-to-maintain selector lists.

## :has() — the parent selector, finally

`:has()` matches an element if the selector inside it matches something within that element's descendants (or, with combinators, siblings).

```css
/* style a form group differently when it contains an invalid input,
   without JavaScript toggling a class on the parent */
.form-group:has(input:invalid) {
  border-left: 3px solid var(--color-error);
}

/* style a card differently depending on whether it has an image,
   for layouts where that changes the grid */
.card:has(img) {
  grid-template-rows: auto 1fr;
}

/* a genuinely new capability: style a label based on a sibling checkbox's state */
.toggle-row:has(input:checked) {
  background: var(--color-selected);
}
```

That last example is the one that used to require JavaScript unconditionally — CSS has no ancestor combinator otherwise, and `:has()` combined with `:checked` gives you a checkbox-driven visual state on an ancestor without a single line of script.

## :is() — collapsing repetitive selector lists

Before `:is()`, targeting several different contexts with the same rule meant spelling out every combination:

```css
/* the old way */
article h2, article h3, article h4,
section h2, section h3, section h4 {
  font-weight: 600;
}

/* with :is() */
:is(article, section) :is(h2, h3, h4) {
  font-weight: 600;
}
```

`:is()` takes a selector list and matches if *any* selector in it matches, functioning like a combinatorial shorthand. It also has a practical resilience benefit: if one selector in the list is invalid or unsupported, the entire un-grouped rule in old-style CSS would fail to apply at all for some browsers' parsing behavior, whereas `:is()`'s forgiving list means a single bad entry doesn't necessarily invalidate the whole selector.

## :where() — the same grouping, zero specificity

`:is()` takes on the specificity of its most specific argument. `:where()` is functionally identical for matching purposes but always contributes zero specificity, which makes it the right choice for reset-style or utility base styles that should be trivially overridable:

```css
/* :where() so any component-level class can override this without !important
   or a specificity fight */
:where(article, section, aside) :where(h2, h3, h4) {
  margin-block: 0.5em;
}

/* a real component override — this wins cleanly regardless of
   :where()'s selector complexity, because :where() contributes nothing */
.pricing-card h3 {
  margin-block: 1.5em;
}
```

Library and design-system authors lean on `:where()` heavily for exactly this reason — base styles that consumers can override with an ordinary single class, without needing to out-specificity a selector list they didn't write.

## Combining all three

```css
/* highlight any card-like container that has an unread badge inside it,
   across whichever component variant is present, without raising specificity */
:where(.card, .list-item, .notification-row):has(.badge--unread) {
  outline: 2px solid var(--color-accent);
}
```

## Performance note on :has()

`:has()` is more expensive to evaluate than a simple selector because, depending on the browser's implementation, it may need to check descendants to determine whether the ancestor matches at all. It's well-optimized in current engines for typical use, but avoid attaching it to extremely broad selectors — `body:has(.some-rare-class)` evaluated against every state change is a different cost profile than a scoped `.form-group:has(input:invalid)`.
