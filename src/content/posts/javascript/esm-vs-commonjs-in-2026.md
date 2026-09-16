---
title: "ESM vs CommonJS in 2026: What Actually Matters Now"
slug: "esm-vs-commonjs-in-2026"
description: "A practical look at where ESM and CommonJS interop still breaks in 2026, and how to pick a module format for a new library or app without regret."
publishedAt: "2025-10-19"
updatedAt: "2026-09-16"
category: "JavaScript"
tags:
  - ESM
  - Node.js
  - JavaScript
  - Frontend Engineering
---

The module wars are mostly over, but the battlefield left scars. Node has supported ESM natively for years now, most major frameworks default to it, and yet dual-package hazards, half-migrated dependency trees, and `require()` of ESM still show up in real incident reports. If you're starting a new package or app in 2026, the decision isn't "which format is better" — it's "which format minimizes the number of ways your users can shoot themselves in the foot."

## The dual-package hazard hasn't gone away

When a package ships both a CJS and an ESM build, Node resolves them independently based on how the consumer imports it. If your library keeps module-level state (a cache, a singleton, a registry), a project that pulls in both entry points — directly and transitively through a different dependency — ends up with two disconnected copies of that state. This is still the single most common cause of "it works in isolation but not in my app" bug reports for library authors who ship dual builds.

```javascript
// package.json for a dual-format library
{
  "name": "my-lib",
  "type": "module",
  "exports": {
    ".": {
      "import": "./dist/index.mjs",
      "require": "./dist/index.cjs"
    }
  },
  "main": "./dist/index.cjs",
  "module": "./dist/index.mjs"
}
```

If your library has no shared mutable state across the two builds, dual-publishing is safe. If it does — even something as innocuous as a `WeakMap` cache — pick one format and stop trying to please everyone.

## Interop still has sharp edges

`require()` of an ES module works in current Node for synchronous, side-effect-free modules, but it fails outright the moment the module has top-level `await` or certain circular dependency shapes. Going the other direction — `import` of a CommonJS module from ESM — is more forgiving: Node synthesizes a default export and does its best with named exports via static analysis, but that analysis isn't perfect for dynamically assigned `module.exports` properties.

```javascript
// Works: importing CJS from ESM
import pkg from "legacy-cjs-package";
const { doThing } = pkg;

// Fragile: named import depends on static analysis succeeding
import { doThing } from "legacy-cjs-package"; // may be undefined
```

The safe default when consuming an older CJS dependency from ESM code is to import the default and destructure manually, rather than trusting named imports to resolve correctly.

## Bundlers still disagree with Node

Webpack, esbuild, and Rollup each have their own interop shims for CJS/ESM boundaries, and they don't all match Node's runtime behavior exactly — particularly around `__esModule` interop flags and how a CJS module's `exports.default` gets treated. Code that behaves identically under `node` and under your bundler's dev server can diverge once it hits a build step with different interop settings. If you maintain a library, test it under at least Node's native loader and whatever bundler your primary consumers use — don't assume one implies the other.

## What to actually do for a new project

For a new app: use `"type": "module"` and don't look back. Nearly every actively maintained dependency has an ESM path in 2026, and the ergonomic wins (top-level await, static analysis for tree-shaking, no `__dirname` weirdness once you adopt `import.meta.url`) are worth it.

For a new library aimed at broad consumption: publish ESM-only unless you have concrete evidence a meaningful slice of your users are stuck on old CJS-only tooling. Dual-publishing is a maintenance tax and a hazard-generator; only pay it when you've measured the demand, not preemptively.

## A worked example

A library `"type": "module"` with `exports` for `import` and a thin CJS wrapper only if you must. Node `require(esm)` may work in new Node; you still test both. An app is ESM-only: `node --experimental-strip-types` or a bundler. You set `"moduleResolution": "bundler"` in TS for the app and `"Node16"` for the library.

CI runs `node --input-type=module` on a smoke import.

## Failure modes

Dual packages that fake ESM with `esm.mjs` importing CJS that then imports ESM (cycle). `__dirname` in ESM without `import.meta.filename`. Default import interop (`mod.default`). TypeScript `esModuleInterop` masking runtime failure. `exports` missing `require` condition. Jest configs stuck on CJS.

Shipping `"type": "module"` with `.js` files that use `require`.

## When this is the wrong tool

A 50-line CLI already in CJS does not need a conversion project. Do not rewrite Next.js internals. Bundled browser apps already flatten modules — the dual-package problem is for Node libraries. Avoid "universal" packages that use `eval` to detect the system. If all consumers are bundlers, ship ESM only.
