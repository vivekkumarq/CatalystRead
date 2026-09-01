---
title: "Responsive Images: srcset, sizes, and Modern Formats"
slug: "responsive-images-srcset-sizes-formats"
description: "How srcset and sizes let the browser pick the right image resolution automatically, and how to layer AVIF and WebP on top with picture and source."
publishedAt: "2026-08-11"
category: "Web Development"
tags:
  - Web Performance
  - Images
  - HTML
  - Web Development
---

Serving one image file to every device means either shipping a desktop-resolution image to a phone on a metered connection, or capping quality for everyone to keep mobile payloads reasonable. `srcset` and `sizes` let the browser make that decision itself, per device, using information — actual viewport width, pixel density, connection speed on some browsers — that isn't available at build time.

## srcset with width descriptors

The most common pattern describes several source files by their intrinsic width, using the `w` descriptor:

```html
<img
  src="hero-800.jpg"
  srcset="
    hero-480.jpg 480w,
    hero-800.jpg 800w,
    hero-1200.jpg 1200w,
    hero-1600.jpg 1600w
  "
  sizes="(max-width: 600px) 100vw, (max-width: 1200px) 50vw, 800px"
  alt="Product overview"
/>
```

`sizes` is the part people skip, and skipping it breaks the whole mechanism — without it, the browser assumes the image renders at 100% viewport width and picks accordingly, which is wrong for anything narrower, like a half-width column on desktop. The `sizes` value above tells the browser: below 600px viewport, this image renders at full viewport width; below 1200px, at half; otherwise, a fixed 800px. The browser combines that with its own device pixel ratio and viewport width to pick the best-matching `srcset` candidate — you're not choosing the image, you're describing layout so the browser can choose correctly.

## Density descriptors for fixed-size images

When an image renders at a fixed CSS size regardless of viewport — an avatar, a logo — density descriptors (`1x`, `2x`) are simpler than width descriptors, since there's no layout variation to describe:

```html
<img
  src="avatar-40.png"
  srcset="avatar-40.png 1x, avatar-80.png 2x, avatar-120.png 3x"
  alt="User avatar"
  width="40"
  height="40"
/>
```

## Serving modern formats with graceful fallback

`<picture>` with multiple `<source>` elements lets the browser pick the first format it supports, falling back to the `<img>` at the end for anything older:

```html
<picture>
  <source type="image/avif" srcset="hero.avif" />
  <source type="image/webp" srcset="hero.webp" />
  <img src="hero.jpg" alt="Product overview" width="1200" height="675" />
</picture>
```

AVIF typically produces smaller files than WebP at comparable visual quality, and WebP smaller than JPEG, so this ordering tries the best option first and degrades gracefully. Combine `<picture>`'s format fallback with `srcset`/`sizes` inside each `<source>` for the full matrix of format and resolution selection together.

## width, height, and layout shift

Always set explicit `width` and `height` (or `aspect-ratio` in CSS) even when using `srcset` — the browser needs to reserve layout space before the image downloads, and without it, images loading in cause a cumulative layout shift as content jumps to accommodate them once they arrive:

```css
img {
  height: auto; /* combined with width+height attributes, preserves aspect ratio while staying responsive */
}
```

## Lazy loading as the last easy win

```html
<img src="below-fold.jpg" loading="lazy" alt="Supplementary chart" width="600" height="400" />
```

`loading="lazy"` defers offscreen image requests until the user scrolls near them, native to the browser with no library required — reserve it for genuinely below-the-fold images, since applying it to a hero image or anything near the initial viewport delays a paint that should have started immediately, directly hurting Largest Contentful Paint.
