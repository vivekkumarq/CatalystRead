---
title: "Import Maps: Browser-Native Bare Specifiers Without a Bundler (Until You Need One)"
slug: "javascript-import-maps"
description: "importmap JSON, bare specifiers in the browser, integrity, and the production limits that keep Vite in the toolchain."
publishedAt: "2026-09-13"
category: "JavaScript"
tags:
  - JavaScript
  - Modules
  - Browsers
  - ESM
sources:
  - title: "Import maps"
    publisher: "WICG / HTML"
    url: "https://html.spec.whatwg.org/multipage/webappapis.html#import-maps"
  - title: "Import maps"
    publisher: "MDN"
    url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/script/type/importmap"
---

Browsers cannot natively resolve `import 'lodash'` — that is a Node/bundler convention. An **import map** is a JSON script (`type="importmap"`) that maps bare specifiers to URLs:

```html
<script type="importmap">
{
  "imports": {
    "preact": "/vendor/preact.js",
    "preact/": "/vendor/preact/"
  }
}
</script>
```

After the map, `import { h } from 'preact'` works in a classic ESM `type="module"` graph **on that page**. Deno and some runtimes have similar maps. This is how you demo without a bundler, or how a large org hosts a shared CDN of modules.

## Scopes and integrity

Maps support `scopes` so `/admin/` resolves `lib` differently. `integrity` metadata (where supported) pins hashes. A map is **inline or a single controlling map** — you cannot dump three maps and hope. It must be parsed before module scripts that need it.

Relative URLs in the map are against the base URL. A CDN prefix typo 404s the whole graph. CORS on cross-origin modules still applies.

## What import maps do not replace

Tree-shaking, TypeScript, JSX, CSS pipelines, and code splitting policy. Production apps still bundle because HTTP/2 is not magic enough for 400 tiny modules (though 10 is often fine). Import maps shine for: polyfill CDNs, multi-page apps with a few shared ESM files, and progressive migration where some pages stay unbundled.

Node's `--experimental-import-maps` / policy is a different story; this article is the HTML one. Mixing with bundlers: Vite can emit import maps in specialized setups; don't fight the bundler on the same specifier.

## Caching

Mapped URLs should be hashed filenames. Changing the map without hashing is a cache-bust problem for the JSON itself (inline maps bust with HTML).

Read the HTML spec's import maps section and MDN. Then load two modules with a map on a static page. If you need 50 npm packages, you needed a bundler. If you need `import 'shared/logger'` across static HTML files, you needed a map.
