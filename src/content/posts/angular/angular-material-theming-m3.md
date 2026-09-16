---
title: "Angular Material Theming on M3: Tokens, Not Rewriting palettes.css"
slug: "angular-material-theming-m3"
description: "Material 3 color roles, density, and mixins: how to theme Angular Material without fighting a leftover M2 palette map."
publishedAt: "2026-09-03"
category: "Angular"
tags:
  - Angular
  - Angular Material
  - CSS
  - Design Systems
sources:
  - title: "Theming Angular Material"
    publisher: "Angular Material"
    url: "https://material.angular.dev/guide/theming"
  - title: "Material Design 3"
    publisher: "Google"
    url: "https://m3.material.io/"
---

Angular Material's **M3** theming is built on **design tokens**: primary, secondary, tertiary, error, surface, and a nest of on-color roles. You generate a theme with Sass mixins (`mat.theme` / the current `define-theme` family — names moved) from a seed color or a full scheme, then include component mixins. Copy-pasting an M2 `$mat-indigo` map into an M3 app is how you get a half-migrated visual bug.

## Roles versus one primary hex

M3 wants a **scheme**, not a single brand hex applied to every button. Surfaces and containers distinguish cards, nav, and high-emphasis buttons. Dark theme is a second scheme, not `filter: invert`. Density and typescale are first-class; compact tables should use density tokens rather than shrinking every `font-size` by hand.

```scss
@use '@angular/material' as mat;
html {
  @include mat.theme((
    color: ( theme-type: light, primary: mat.$azure-palette ),
    typography: Roboto,
    density: 0,
  ));
}
```

Check the docs for your Material version; the mixin shape changed during M3 rollout. `color-scheme` CSS and `prefers-color-scheme` should drive which theme class is on `body`.

## Overrides

Use component-level override mixins / CSS variables Material exposes (`--mat-sys-*` system variables in later versions) instead of piercing `::ng-deep` into internals. Internals change. Tokens are the stability bet. If a designer hands you a one-off hex for a single button, a local class is fine; if they hand you 40 one-offs, you do not have a theme.

M2 components left in the app will look wrong next to M3. Migrate by component, or don't mix.

## Accessibility

Contrast on `on-primary` text is a token problem. Do not put low-contrast gray on `surface-container`. Test both schemes.

Read the current Angular Material theming guide and M3 color roles. Then delete custom CSS that sets `mat-button` background to a hex. If the mixin does not express the brand, extend tokens — don't fight the component internals. The theme is a map of roles. Hex-by-hex is how M2 stylesheets became unmaintainable.
