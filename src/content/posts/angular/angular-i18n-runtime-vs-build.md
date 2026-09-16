---
title: "Angular i18n: Build-Time Locales versus Runtime Translation"
slug: "angular-i18n-runtime-vs-build"
description: "@angular/localize extract-i18n and per-locale builds versus runtime JSON (ngx-translate and friends): when to freeze strings at compile time."
publishedAt: "2026-09-04"
category: "Angular"
tags:
  - Angular
  - i18n
  - Localization
  - Build
sources:
  - title: "Internationalization (i18n)"
    publisher: "Angular docs"
    url: "https://angular.dev/guide/i18n"
  - title: "@angular/localize"
    publisher: "Angular"
    url: "https://angular.dev/tools/cli/localize"
---

Angular's built-in i18n tags templates (`i18n` attributes, `$localize` in code), **extracts** XLIFF/JSON, and can **compile a locale into the bundle**. Each language is a build (or a set of files with `localize`). Switching language at runtime then means **reload** or a second deployment artifact. Runtime libraries (`@ngx-translate/core` and similar) keep one bundle and swap a JSON map. That is slower to fail at compile time and easier to hot-swap for user preference.

## Build-time: `$localize` and extract-i18n

```html
<h1 i18n="@@home.hello">Hello</h1>
```

IDs (`@@`) should be stable. Extract in CI, send XLIFF to translators, import, `ng build --localize`. ICU plurals and selects are in the syntax. You get unused-string checks and no missing key at runtime if the pipeline is strict. Cost: N locales ≈ N builds (mitigated by Angular's localize in one process for many locales, still more output). Locale-specific lazy chunks need care.

RTL: `dir` and locale data (`registerLocaleData`) for pipes (`DatePipe`) are separate from message catalogs. A translated string in an LTR layout is still a bug.

## Runtime maps

A `TranslateService` and `en.json` is how many teams start. Missing keys show the key in production unless you lint. Changing copy without a redeploy is a plus for marketing sites and a versioning mess for apps that need legal-reviewed strings. SSR must load the right map per request (`Accept-Language` or cookie) or you hydrate-mismatch.

Hybrid: `$localize` for app chrome, CMS for editorial pages.

## Choosing

Regulated product, few locales, strong CI: build-time Angular i18n. Many locales, translators in a CMS, language switch without reload: runtime, with a fallback and a test that every key exists. Don't mix two frameworks on the same view.

Read Angular's i18n guide for ICU and extraction, then time a locale switch. If product requires instant switch on a huge app, runtime wins. If product requires "the German legal string is in the signed artifact," compile-time wins. That is the trade, not "which blog post used ngx-translate in 2018."
