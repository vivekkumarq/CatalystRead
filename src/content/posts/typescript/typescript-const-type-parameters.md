---
title: "TypeScript const Type Parameters: Inference That Stays Literal"
slug: "typescript-const-type-parameters"
description: "const type parameters (TypeScript 5.0): when T extends readonly any[] infers tuples of literals, and how that replaces as const on every call."
publishedAt: "2026-09-05"
category: "TypeScript"
tags:
  - TypeScript
  - Generics
  - Inference
  - Types
sources:
  - title: "const Type Parameters"
    publisher: "TypeScript 5.0 release notes"
    url: "https://www.typescriptlang.org/docs/handbook/release-notes/typescript-5-0.html#const-type-parameters"
  - title: "TypeScript Handbook: Generics"
    publisher: "TypeScript"
    url: "https://www.typescriptlang.org/docs/handbook/2/generics.html"
---

`as const` on an object freezes inference to literal types. Without it, `{ method: 'GET' }` becomes `{ method: string }` when passed into a generic function that infers `T`. **const type parameters** (`<const T>`) tell the compiler to infer that argument **as if** the caller had written `as const`. Route builders, CSS token maps, and `satisfies`-adjacent config helpers get precise keys without asking every caller to remember `as const`.

The satisfies operator article already covers `satisfies`. This is the generic-function half of the same "don't widen" problem.

## The widening problem

```ts
function makeEnum<T extends Record<string, string>>(o: T) {
  return o;
}
const E = makeEnum({ A: 'a' });
// without const T, T is { A: string }
```

```ts
function makeEnum<const T extends Record<string, string>>(o: T) {
  return o;
}
const E = makeEnum({ A: 'a' });
// T is { readonly A: "a" }
```

Use `<const T>` when the function's result should retain literal unions for keys and values. Skip it when you **want** widening (accept any string). Combining `const T` with a constraint that is too wide can still surprise; constrain to `readonly unknown[]` or a specific shape.

## Tuples and rest

`function tuple<const T extends readonly unknown[]>(...args: T): T` infers `[1, 'x']` not `(number | string)[]`. That is how typed SQL fragment helpers and path builders work. Mutation: inferred readonly-ness may reject `.push`. That is a feature.

Don't slap `const` on every generic. Inference can become too tight and break callers who pass `string` variables. Offer two overloads if you must support both literals and widened strings.

## Libraries

If you author a builder API, `const` type parameters reduce docs that say "pass `as const`." If you consume one, and inference is suddenly readonly tuples, you hit this feature.

Read the 5.0 notes' examples, then convert one helper that currently documents `as const`. The type parameter is the documentation now.
