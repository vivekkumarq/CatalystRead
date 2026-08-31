---
title: "Declaration Files and Publishing Types Other People Will Actually Use"
slug: "declaration-files-and-publishing-types"
description: "How .d.ts files, module augmentation, and package.json exports maps work together, and the mistakes that quietly break your library's consumers."
publishedAt: "2026-01-25"
category: "TypeScript"
tags:
  - TypeScript
  - Declaration Files
  - Package Publishing
  - Node.js
---

Publishing a package with working JavaScript is the easy part. Publishing one where the types resolve correctly for every consumer — ESM, CJS, bundler, Node's native resolution, a monorepo with `paths` aliases — is where most libraries quietly fail their users. The failure mode is rarely a crash; it's TypeScript falling back to `any` somewhere and nobody noticing until a consumer files an issue.

## Hand-written vs generated .d.ts

For a library with a public API surface you control tightly, generating declarations with `tsc --declaration` from your source is almost always the right call — it stays in sync automatically, and hand-maintained `.d.ts` files drift the moment someone changes a function signature without remembering to update the parallel file.

```typescript
// tsconfig.json
{
  "compilerOptions": {
    "declaration": true,
    "declarationMap": true,
    "outDir": "dist"
  }
}
```

`declarationMap` is worth turning on specifically for library authors — it lets consumers' editors jump to your actual `.ts` source instead of the flattened `.d.ts`, which makes debugging your library from the outside dramatically less painful.

Hand-written declarations still have a place: wrapping an untyped JS dependency, or writing ambient declarations for non-TypeScript assets your build pipeline handles.

```typescript
// css-modules.d.ts
declare module "*.module.css" {
  const classes: Record<string, string>;
  export default classes;
}

declare module "*.svg" {
  import type { FC, SVGProps } from "react";
  const Component: FC<SVGProps<SVGSVGElement>>;
  export default Component;
}
```

## Module augmentation

When you need to extend a type from a library you don't own — adding a custom property to Express's `Request`, for instance — augment its module rather than redefining the whole thing:

```typescript
import "express";

declare module "express" {
  interface Request {
    user?: { id: string; role: string };
  }
}
```

This merges into the existing `Request` interface rather than replacing it, so the rest of Express's typing stays intact. It has to live in a file that's actually included in your program's compilation — a stray `.d.ts` that nothing imports or that isn't covered by `include` in `tsconfig.json` will silently do nothing.

## Getting exports and types right in package.json

This is where most publishing mistakes happen. If your package supports both ESM and CJS, each condition in the `exports` map needs its own `types` entry, and it needs to come before the alternative for the same condition — the `types` condition is order-sensitive relative to `import`/`require`, so put it first:

```json
{
  "name": "my-lib",
  "exports": {
    ".": {
      "types": {
        "import": "./dist/esm/index.d.ts",
        "require": "./dist/cjs/index.d.cts"
      },
      "import": "./dist/esm/index.js",
      "require": "./dist/cjs/index.cjs"
    }
  }
}
```

Two common breakages to check for before publishing:

- **Missing `types` in the `exports` map entirely.** Older setups relied on the top-level `"types"` field in `package.json`, but that's ignored for subpaths and can be ignored by resolvers entirely once `exports` is present. If `exports` exists, every entry point needs its own `types` condition.
- **Leaking overly narrow inferred types.** If you don't annotate a function's return type explicitly and TypeScript infers something like a private internal class instance, consumers can get a type they can't even name in their own code, or errors referencing a type they have no import path to. Explicitly annotate public API return types rather than trusting inference for anything crossing your package boundary — inference is great internally and risky at the edge you don't control.

Test the published output with `npm pack` and installing the tarball in a throwaway project before shipping — `npm link` and local monorepo resolution hide exports-map bugs that only surface once someone installs your package for real.
