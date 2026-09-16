---
title: "Conditional and Mapped Types: Building Your Own Utility Types"
slug: "conditional-and-mapped-types-in-typescript"
description: "Partial, Pick, and Readonly aren't compiler magic — learn the conditional and mapped types they're built from, and use them to write your own."
publishedAt: "2025-07-13"
updatedAt: "2026-09-16"
category: "TypeScript"
tags:
  - Conditional Types
  - Mapped Types
  - TypeScript
  - Type Safety
---

TypeScript's built-in utility types — `Partial`, `Pick`, `Readonly` — aren't compiler magic. They're written in ordinary TypeScript, using two features you can use yourself: conditional types and mapped types. Once you understand how `Partial<T>` is actually implemented, writing your own utility types for the shapes specific to your codebase stops feeling like arcane wizardry.

## Conditional types: type-level if statements

A conditional type picks between two types based on whether one type is assignable to another:

```typescript
type IsString<T> = T extends string ? true : false;

type A = IsString<"hello">; // true
type B = IsString<42>;      // false
```

This becomes genuinely useful with `infer`, which lets you pull a type out of a larger structure instead of just testing it:

```typescript
type UnwrapPromise<T> = T extends Promise<infer U> ? U : T;

type C = UnwrapPromise<Promise<number>>; // number
type D = UnwrapPromise<string>;          // string
```

`infer U` says "whatever type fills this position, capture it as `U` and give it back to me." It's how `Awaited<T>` is built under the hood, and it's the same trick you'd use to extract a function's return type or an array's element type.

### Distribution over unions

Conditional types distribute automatically over unions, which trips people up the first time they see it:

```typescript
type ToArray<T> = T extends unknown ? T[] : never;

type Result = ToArray<string | number>; // string[] | number[], not (string | number)[]
```

Each member of the union is checked independently and the results are re-unioned. If you don't want that behavior, wrap both sides in a tuple: `[T] extends [unknown] ? T[] : never` disables distribution.

## Mapped types: transforming every key at once

A mapped type walks the keys of an existing type and applies the same transformation to each one:

```typescript
type MyPartial<T> = {
  [K in keyof T]?: T[K];
};

type MyReadonly<T> = {
  readonly [K in keyof T]: T[K];
};
```

That's the entire implementation of `Partial` and `Readonly`. The `[K in keyof T]` syntax is the mapped-type equivalent of a `for...in` loop over the type's keys.

## Combining both: a real utility type

A deep-readonly type — one that recursively locks down nested objects, not just the top level — needs both conditional and mapped types together:

```typescript
type DeepReadonly<T> = T extends object
  ? { readonly [K in keyof T]: DeepReadonly<T[K]> }
  : T;

interface Config {
  name: string;
  server: { host: string; port: number };
}

type FrozenConfig = DeepReadonly<Config>;
// server.host is now readonly too, not just server itself
```

The conditional type (`T extends object ? ... : T`) is the base case that stops recursion at primitives; the mapped type does the actual transformation at each level.

## Key remapping, briefly

Since TypeScript 4.1, mapped types can rename keys as they map them, using `as`:

```typescript
type Getters<T> = {
  [K in keyof T as `get${Capitalize<string & K>}`]: () => T[K];
};

type UserGetters = Getters<{ name: string; age: number }>;
// { getName: () => string; getAge: () => number }
```

This is where mapped types start overlapping with template literal types — worth knowing exists, but reach for it only when a codebase genuinely needs generated-shape types like this, not as a default way to define an interface.

Once these two features click, most "how do I express this type" problems in code review stop being blockers — you either extend an existing utility type or write a five-line one specific to the shape you actually have, instead of reaching for `any` because the built-ins don't quite fit.

## A worked example

`type OptionalNullable<T> = { [K in keyof T]: T[K] | null }` vs `Partial`. A `DeepReadonly<T>` mapped type recurses on objects but stops on built-ins. A conditional `T extends Function ? never : T` filters keys via `as` remapping: `{ [K in keyof T as T[K] extends Function ? never : K]: T[K] }` yields a data-only view.

You test with `Expect<Equal<..., ...>>` in a types test file, not only by hovering.

## Failure modes

Distributing accidentally and producing `never`. Homomorphic mapped types that lose modifiers (`readonly`, optional) unless you copy them. Recursing into `Date` or arrays wrongly. Slow types from nested mapped conditionals on large unions. `keyof` of a union becoming the intersection of keys.

Using `any` in a mapped type that infects outputs.

## When this is the wrong tool

If a runtime mapper exists, codegen or a function beats 40 lines of types. Do not map every JSON field into a branded type. Utility types in `lib` already cover `Pick`/`Omit`. When the checker lags, simplify the model. Mapped types cannot enforce runtime validation — pair with zod. Avoid publishing mapped types that leak `undefined` vs optional inconsistency.
