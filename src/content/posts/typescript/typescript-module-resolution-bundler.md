---
title: "moduleResolution: bundler — What TypeScript Checks When Vite Is the Compiler"
slug: "typescript-module-resolution-bundler"
description: "bundler resolution, extension requirements, package.json exports, and the mismatch between tsc and esbuild that still ships a broken import."
publishedAt: "2026-09-06"
category: "TypeScript"
tags:
  - TypeScript
  - Modules
  - Bundlers
  - Tooling
sources:
  - title: "Module Resolution"
    publisher: "TypeScript Handbook"
    url: "https://www.typescriptlang.org/docs/handbook/modules/reference.html"
  - title: "moduleResolution bundler"
    publisher: "TypeScript 5.0 notes"
    url: "https://www.typescriptlang.org/docs/handbook/release-notes/typescript-5-0.html#--moduleresolution-bundler"
---

`moduleResolution: "node10"` (old `"node"`) does not understand `package.json` `"exports"` the way modern Node does. `"nodenext"` is strict about **file extensions** in relative imports, matching Node ESM. **`"bundler"`** is the mode for Vite, webpack, and esbuild apps: it understands `exports` and extension-less relative imports the bundler will resolve, without pretending `tsc` will emit runnable Node ESM.

## Pick the resolution of the runtime you have

A Vite SPA should use `moduleResolution: "bundler"` with `module: "esnext"` (or the CLI default for new apps). A library you publish to npm for Node should use `"nodenext"` and include `.js` extensions in relative imports in the emitted JS (TypeScript 5's bundler mode is not that). Dual packages are why people cry.

```json
{
  "compilerOptions": {
    "module": "esnext",
    "moduleResolution": "bundler",
    "verbatimModuleSyntax": true
  }
}
```

`exports` in a dependency: TypeScript will refuse imports that Node would also refuse (`#internal`). If the bundler is more permissive than `tsc`, CI with `tsc --noEmit` is the truth for types; the bundler is the truth for runtime. Align them.

## Extension and type-only imports

`verbatimModuleSyntax` / `isolatedModules` require `import type` where needed because Babel/esbuild erase types per-file. `bundler` resolution still needs you not to import `.ts` extensions in ways the bundler config forbids (or to enable the matching Vite option).

Path aliases (`paths`) must be duplicated in the bundler config. `tsc` resolving `@/foo` while Vite does not is a green typecheck and a red build.

## Project references

References plus bundler mode are fine for apps. Don't use `bundler` resolution in a Node script package by accident.

Read the modules reference page's resolution table. Then run `tsc --traceResolution` on one failing import. The mode you chose is a lie detector for `exports`. If Vite builds and `tsc` fails, you are about to ship a path only the bundler understood — or you forgot `noEmit` CI. Wire both.
