---
title: "Enums vs Union Types in TypeScript Libraries: What You Emit Is the API"
slug: "typescript-enums-vs-unions-in-libraries"
description: "Numeric enums, const enums, and string unions: tree-shaking, isolatedModules, and why published .d.ts should usually avoid open-ended enums."
publishedAt: "2026-09-07"
category: "TypeScript"
tags:
  - TypeScript
  - Libraries
  - Enums
  - API Design
sources:
  - title: "Enums"
    publisher: "TypeScript Handbook"
    url: "https://www.typescriptlang.org/docs/handbook/enums.html"
  - title: "const assertions"
    publisher: "TypeScript Handbook"
    url: "https://www.typescriptlang.org/docs/handbook/release-notes/typescript-3-4.html#const-assertions"
---

TypeScript **enums** emit JavaScript (unless `const enum`, which inlines and breaks `isolatedModules` unless preserved). A **string union** (`'idle' | 'ready'`) erases completely. For an application, this is taste. For a **library**, it is bundle size, speed of compilation, and whether consumers on Babel can import your enum object.

## Unions for closed string sets

```ts
export type Status = 'idle' | 'loading' | 'error';
export const STATUSES = ['idle', 'loading', 'error'] as const;
```

Consumers get autocomplete. You can iterate `STATUSES`. No reverse mapping. No `Status.Idle` object at runtime unless you add the array. This tree-shakes. `isolatedModules` is happy.

Numeric enums with reverse mappings (`Color[0] === 'Red'`) are the worst emit: an IIFE object. They also compare loosely with numbers from APIs. Prefer union of numbers only if you must, or a const object:

```ts
export const Color = { Red: 0, Blue: 1 } as const;
export type Color = (typeof Color)[keyof typeof Color];
```

That is the "enum pattern" without the syntax.

## When an enum is honest

You need a runtime object and you control the TS compiler flags of all consumers. Even then, **string enums** (`enum E { A = 'A' }`) are clearer than numeric. `const enum` requires `preserveConstEnums` or you will break isolated transpilation — many libraries forbid them.

Don't use enums as bitflags unless you document it; unions of numbers won't bitwise-or as nicely, which is a rare real need.

## .d.ts surface

If you export an enum, consumers see a runtime export. Semver: adding a union member is a breaking change for exhaustiveness; adding an enum member is too. Document exhaustiveness. `const` objects plus `satisfies Record<string, …>` (in apps) keep a single source.

Read the handbook's enum pitfalls (especially `const enum` and isolatedModules). Then look at your library's `dist`. If an IIFE enum is in the chunk for two string constants, you paid for syntax. Replace it with a union and a const array. The `.d.ts` will be smaller and the bundler will thank you.
