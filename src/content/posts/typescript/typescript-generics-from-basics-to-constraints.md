---
title: "TypeScript Generics: From First Principles to Real Constraints"
slug: "typescript-generics-from-basics-to-constraints"
description: "Generics keep the type information any throws away — how to write them, constrain them with extends, and know when a plain union is the better call."
publishedAt: "2025-06-15"
updatedAt: "2026-09-16"
category: "TypeScript"
tags:
  - Generics
  - TypeScript
  - Type Safety
  - Frontend Engineering
---

Every TypeScript codebase has at least one function that used to return `any` because writing the generic version felt like overkill. Then a caller passes the wrong shape, nothing catches it until runtime, and someone spends an afternoon in the debugger to find out `data.user.id` was actually a string, not a number. Generics exist to prevent exactly that: they let a function or type stay flexible about *which* type it works with, without giving up on knowing what that type is.

## Starting with the problem any creates

Consider a naive cache getter:

```typescript
function getFromCache(key: string): any {
  return cacheStore[key];
}

const user = getFromCache("user:42");
user.nonExistentMethod(); // compiles, blows up at runtime
```

The function is technically reusable — it works for any value in the cache — but it throws away all the information the caller actually has. A generic version keeps that information intact:

```typescript
function getFromCache<T>(key: string): T | undefined {
  return cacheStore[key] as T | undefined;
}

const user = getFromCache<User>("user:42");
user?.nonExistentMethod(); // error: caught at compile time
```

`T` isn't a special type — it's a placeholder the caller fills in, either explicitly (`<User>`) or by inference from an argument.

## Constraining generics instead of leaving them wide open

An unconstrained `<T>` accepts literally anything, which is often too permissive. Say you're writing a `pluck`-style helper that reads a property off an object — you need TypeScript to know the object actually has that key:

```typescript
function pluck<T, K extends keyof T>(obj: T, key: K): T[K] {
  return obj[key];
}

const price = pluck({ id: 1, price: 29.99 }, "price"); // number
pluck({ id: 1, price: 29.99 }, "weight"); // error: no "weight" on this object
```

`K extends keyof T` is the constraint: `K` can be any key of `T`, and nothing else. This is the pattern to reach for whenever you catch yourself writing `Record<string, any>` just to make a function accept "some object with some keys."

## Generic interfaces, classes, and defaults

Generics aren't limited to functions. A typed event emitter or a repository class both benefit from carrying a type parameter through their whole shape:

```typescript
interface Repository<T, ID = string> {
  findById(id: ID): Promise<T | null>;
  save(entity: T): Promise<void>;
}

class UserRepository implements Repository<User> {
  async findById(id: string) {
    return db.users.find(id);
  }
  async save(user: User) {
    await db.users.upsert(user);
  }
}
```

The `ID = string` default means most implementers don't need to specify it — it only becomes relevant for something like a repository keyed by a numeric or composite ID.

## When a generic is the wrong tool

Not every flexible-looking function needs a type parameter. If a function only ever accepts one of three known shapes, a union is clearer and gives better autocomplete than a generic constrained to that union:

```typescript
// Overkill
function setStatus<T extends "idle" | "loading" | "error">(s: T): void {}

// Better — the type itself says exactly what's allowed
function setStatus(s: "idle" | "loading" | "error"): void {}
```

The generic version buys you nothing here because there's no relationship between the input and some other part of the signature that needs preserving. That's the real test for whether you need a generic: does the type of one thing — an argument, a return value, a property — depend on the type of another? If yes, reach for `<T>`. If you're just trying to look flexible, a plain union or a smaller, non-generic signature will read better and catch more mistakes.

## A worked example

`function pluck<T, K extends keyof T>(obj: T, key: K): T[K]`. A React component `function List<T>({ items, render }: { items: T[]; render: (t: T) => ReactNode })`. Constraints: `T extends { id: string }`. Default type params `T = unknown` for containers. Inference from arguments, not from return, in most call sites.

A test of types: `pluck({ a: 1 }, 'a')` is `number`.

## Failure modes

Over-generic APIs (`T` on everything). Constraints too wide (`T extends any`). Generic inference failing so callers pass 4 type args. Variance mistakes in callbacks (`(x: T) => void` vs contravariance). `T[]` vs `Array<T>` confusion with `readonly`. Recursion limits.

`as T` inside the generic function hiding bugs.

## When this is the wrong tool

If there is only one type, write it. Codegen is better than 8 type params for a client. Do not genericize a function to avoid a union of two members. Runtime polymorphism (interfaces) may be clearer for plugins. Generics will not validate JSON. If inference always needs manual params, the signature is wrong — simplify.
