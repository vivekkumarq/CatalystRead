---
title: "infer and Distributive Conditional Types, Without the Folklore"
slug: "typescript-infer-and-distributive-conditionals"
description: "How to pull types out of functions and promises with infer, why unions distribute, and the [T] trick when you do not want that."
publishedAt: "2026-08-17"
updatedAt: "2026-09-16"
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

## A worked example

You want the JSON payload type from `() => Promise<{ data: User }>`:

```typescript
type Payload<T> = T extends (...args: never[]) => Promise<infer R>
  ? R extends { data: infer D }
    ? D
    : never
  : never;
```

For `T = typeof fetchUser`, `Payload<T>` is `User`. If `fetchUser` is overloaded, you may infer the last overload; prefer exporting an explicit `User` from the module instead of archaeology.

To strip `null` from a union without distributing into `never` incorrectly, use `Exclude<T, null>`. To test "is this whole thing a promise," wrap: `[T] extends [Promise<unknown>]`.

## Failure modes

`T extends any ? ...` distributes and can turn `any` into a swamp. `infer U` inside a function type fails on generic call signatures in surprising ways. Recursive conditionals without a base case (`type X<T> = T extends Foo<infer U> ? X<U> : T` on a cyclic type) hit instantiation depth. Distributing over `never` yields `never`, which eats error messages in generic constraints.

People wrap everything in `[T] extends [T]` cargo-cult style and then `Exclude` stops working.

## When this is the wrong tool

If the runtime value is right there, `typeof` and a named interface beat a 15-line infer chain. Codegen from OpenAPI is better than inferring fetch wrappers by hand. `infer` is the wrong tool to "parse" string template types of arbitrary URLs — you will freeze the checker. When a library exports the inner type, import it. Use infer at module boundaries where the wrapper is the only source of truth.

## Review checklist

- Naked `T extends` is intentional distribution; otherwise wrap `[T]`.
- `infer` names are only used on the true branch; failure path is `never` or a documented default.
- Public helpers have names; 12-line nested conditionals stay private.
- Debug with a concrete `type Debug = ...` before blaming the compiler.
