---
title: "Angular's Vite Application Builder: Faster Serves, Different Footguns"
slug: "angular-vite-application-builder"
description: "esbuild/Vite application builder versus webpack: HMR shape, file replacements, and the migration checks that still fail in CI."
publishedAt: "2026-09-02"
category: "Angular"
tags:
  - Angular
  - Vite
  - Tooling
  - Build
sources:
  - title: "Building with the Vite-based application builder"
    publisher: "Angular docs"
    url: "https://angular.dev/tools/cli/build-system-migration"
  - title: "Vite"
    publisher: "vitejs.dev"
    url: "https://vite.dev/guide/"
---

Angular's **application builder** uses Vite for `ng serve` and esbuild for production bundles (with the CLI orchestrating). Webpack builders still exist for some libraries and custom configs. The move is faster cold starts and less RAM. It is not a promise that every `webpack.config.js` plugin ports. File replacements, extra CommonJS packages, and obscure loaders are the migration.

## What changes in daily work

`ng serve` is a Vite server: prebundling `node_modules`, native ESM. Some packages that relied on webpack's magic (`require.context`, certain `raw-loader` patterns) need `asset` imports or explicit Vite plugins via `customViteConfig` when allowed. **Environment file replacements** still work through the CLI `fileReplacements` — verify they apply in both serve and build; mismatches are a classic "works in prod only" bug.

```json
"architect": {
  "build": { "builder": "@angular/build:application" }
}
```

SSR and prerender integrate with the same builder in current CLI versions. Old `server.ts` webpack-specific hooks need the new middleware form. Tailwind and PostCSS are supported; check the versioned guide.

## CommonJS and optimizeDeps

A CJS-only library may need to be in Vite's include/exclude lists. If HMR dies on a file, you imported a side-effecty module that the prebundler grouped wrong. Restart is not a fix; isolate the import.

Source maps in production still cost. The builder's output hashing differs; cache headers on `index.html` must stay short.

## Libraries

`ng-packagr` is still the library pipeline. Do not assume Vite bundles your publishable package. Application builder ≠ library builder.

Read the official migration checklist (`ng update` schematic). Then `ng serve` a lazy route and a file replacement for `environment.prod`. If prod API URLs appear in `ng serve`, replacements are wired to the wrong target. Speed is the headline. Correct `fileReplacements` is the ticket you actually want to close.
