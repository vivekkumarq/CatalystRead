---
title: "Declaration Maps: Debugging Through .d.ts Into the TypeScript You Published"
slug: "typescript-declaration-maps-debugging"
description: "declarationMap and sourceMap for libraries: jumping from consumer code to your src, and the publish files you must not forget."
publishedAt: "2026-09-08"
category: "TypeScript"
tags:
  - TypeScript
  - Debugging
  - Libraries
  - Tooling
sources:
  - title: "declarationMap"
    publisher: "TypeScript tsconfig reference"
    url: "https://www.typescriptlang.org/tsconfig/#declarationMap"
  - title: "sourceMap"
    publisher: "TypeScript tsconfig reference"
    url: "https://www.typescriptlang.org/tsconfig/#sourceMap"
---

You publish `dist/index.js` and `dist/index.d.ts`. A consumer Go-to-Definition lands on a `.d.ts` full of types and no bodies. **`declarationMap`** emits `index.d.ts.map` pointing at your original `.ts` (or at the `.d.ts` sources you ship). Combined with `"types"` / `"exports"` in `package.json` and actually **including** `.ts` or maps in the npm tarball, the editor can jump into implementation. That is how a well-published library feels like it is in the monorepo.

## The flags

```json
{
  "compilerOptions": {
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  }
}
```

`sourceMap` is for **runtime** debugging of JS. `declarationMap` is for **type** navigation. You often want both. `inlineSources` bakes source into the map so you don't have to pack `.ts` files; it grows the package. The other option is `"files": ["dist", "src"]` with maps that use relative paths into `src`.

If maps point to `/Users/you/project/src`, you shipped a machine path. `tsc` uses relative paths when `rootDir` is set; verify the `.map` JSON before publish.

## package.json exports

`exports` must not hide maps. Some setups list only `.js` and `.d.ts`. Editors still find sibling `.d.ts.map` if names match. Don't `files` omit `*.map`. `sideEffects` and bundlers: maps are not runtime.

Monorepos with project references: declaration maps should point to source in the same package, not to `../../packages/foo/src` that isn't in the tarball. Publish the package as a user would consume it; test in a throwaway app with "Go to Definition."

## Privacy

Inline sources in public npm is source disclosure. That is usually the point of OSS. For proprietary packages, maps may be internal-only.

Read the tsconfig pages for the two map flags. Then from a consumer repo, jump to a function. If you stop on a `.d.ts` without a "go to source," the map is missing, mis-pathed, or not published. Types without navigation are half a library DX.
