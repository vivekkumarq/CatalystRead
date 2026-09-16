---
title: "infer and Distributive Conditional Types, Without the Folklore"
slug: "typescript-infer-and-distributive-conditionals"
description: "How to pull types out of functions and promises with infer, why unions distribute, and the [T] trick when you do not want that."
publishedAt: "2026-08-17"
category: "TypeScript"
tags:
  - TypeScript
  - Type System
  - Generics
---

`infer` is how a conditional type reaches inside another type and names a piece of it. Combined with distributive conditionals, it is the mechanism behind `ReturnType`, `Awaited`, and half the utility types in `lib.es5.d.ts`. It looks like magic until you know two rules: inference happens in the `extends` clause, and naked type parameters distribute over unions.

## Pulling an inner type out

```typescript
type Awaited<T> = T extends Promise<infer U> ? Awaited<U> : T;

type Elem<T> = T extends (infer U)[] ? U : never;

type FirstArg<T> = T extends (a: infer A, ...rest: never[]) => unknown ? A : never;
```

The name after `infer` is only in scope on the true branch. If inference fails, the conditional takes the false branch. Nested `infer` is legal; recursive conditionals need a tail that eventually stops (as `Awaited` does on non-promises).

A practical use: unwrap a React prop getter or a tRPC procedure without copy-pasting the inner payload type. When the library changes its wrapper, your `infer` follows.

## Distribution: the surprise

Written as `T extends Foo ? X : Y`, if `T` is a union, TypeScript applies the conditional to each member and unions the results. That is why `Exclude<"a" | "b" | "c", "a">` works.

```typescript
type Distribute<T> = T extends string ? T : never;
// Distribute<"a" | 1> is "a"
```

Sometimes you do **not** want that — you want to test the union as a whole. Wrap the parameter:

```typescript
type IsUnionWhole<T> = [T] extends [string] ? true : false;
// ["a" | 1] extends [string] is false
```

The tuple wrapper is the whole trick. You will see it in `NoInfer` workarounds and in helpers that detect `any` or `never`.

## Debugging a type that "should work"

Instantiate it with a concrete `T` in a playground `type Debug = YourThing<SomeUnion>`. If a member vanished, you distributed. If `infer` became `unknown`, the `extends` pattern did not match (optional parameters, overloads, `this` types). Overloads infer from the last signature unless you write something more precise.

Prefer a named helper over a 12-line nested conditional in a public `.d.ts`. The compiler will still do the work; your teammates will still be able to read the export. `infer` is a scalpel. Utility types that occupy a full screen are a smell that the runtime API should have been simpler.
