---
title: "Type Narrowing and Control Flow Analysis, Beyond typeof"
slug: "type-narrowing-and-control-flow-analysis"
description: "A tour of how TypeScript actually narrows types through your control flow, from typeof guards to custom predicates, and where narrowing quietly breaks."
publishedAt: "2025-09-07"
updatedAt: "2026-09-16"
category: "TypeScript"
tags:
  - Type Narrowing
  - TypeScript
  - Control Flow
  - Type Safety
---

TypeScript's control flow analysis is doing more work than most people give it credit for. It's not just matching `typeof x === "string"` against a type — it's tracking assignments, early returns, and branches through your actual control flow to figure out, at every point in a function, exactly what a variable could be. Understanding how far that tracking goes, and where it stops, saves you from both unnecessary type assertions and narrowing bugs that only show up at runtime.

## The guards you already use

`typeof` and `instanceof` are the two most common narrowing guards, and they work because TypeScript special-cases them in its analysis:

```typescript
function formatId(id: string | number) {
  if (typeof id === "string") {
    return id.padStart(8, "0"); // id is string here
  }
  return id.toFixed(0); // id is number here
}
```

`instanceof` does the same for classes:

```typescript
function handle(error: Error | HttpError) {
  if (error instanceof HttpError) {
    console.log(error.statusCode); // narrowed to HttpError
  }
}
```

## Discriminated unions narrow the whole object

Once a type is a union of object shapes with a shared literal tag, checking that one field narrows every field on the object:

```typescript
type Result =
  | { status: "success"; data: string[] }
  | { status: "error"; message: string };

function render(result: Result) {
  if (result.status === "error") {
    return result.message; // data isn't even a valid property here
  }
  return result.data.join(", ");
}
```

This is worth designing types around deliberately — it's the reason discriminated unions beat a flat object with optional fields for anything state-shaped.

## Writing your own guards

When the built-in guards don't cover a check, a type predicate function lets you teach the compiler your own narrowing logic:

```typescript
interface Admin { role: "admin"; permissions: string[] }
interface Member { role: "member" }

function isAdmin(user: Admin | Member): user is Admin {
  return user.role === "admin";
}

function grant(user: Admin | Member) {
  if (isAdmin(user)) {
    user.permissions.push("read"); // narrowed via the predicate
  }
}
```

Assertion functions do the same thing but for the "throw if not this type" pattern, which is common in validation code:

```typescript
function assertIsAdmin(user: Admin | Member): asserts user is Admin {
  if (user.role !== "admin") throw new Error("not an admin");
}

function grantAdmin(user: Admin | Member) {
  assertIsAdmin(user);
  user.permissions.push("read"); // narrowed after the assertion, no if needed
}
```

The `in` operator works as a lighter-weight guard when you just need to check a property exists, without a full type predicate function:

```typescript
function speak(pet: { bark(): void } | { meow(): void }) {
  if ("bark" in pet) {
    pet.bark();
  } else {
    pet.meow();
  }
}
```

## Where narrowing quietly disappears

Narrowing is tied to control flow, which means it doesn't survive a closure boundary. TypeScript can't prove a captured variable wasn't reassigned by the time an async callback runs:

```typescript
function process(value: string | null) {
  if (value === null) return;
  setTimeout(() => {
    value.trim(); // error — narrowing didn't carry into the callback
  }, 0);
}
```

The fix is usually to copy the narrowed value into a new `const` before the closure captures it, since a `const` can't be reassigned and TypeScript trusts that.

The other common surprise is `.filter(Boolean)`, which looks like it should narrow `(T | null | undefined)[]` down to `T[]` but doesn't, because `Boolean` isn't typed as a predicate:

```typescript
const values: (string | null)[] = ["a", null, "b"];
const filtered = values.filter(Boolean); // still (string | null)[]

const narrowed = values.filter((v): v is string => v !== null); // string[]
```

Small difference, but it's the kind of thing that silently reintroduces a null check three call sites downstream.

## A worked example

`if (typeof x === 'string')` narrows. `if (x != null)` drops `null | undefined`. A custom `isCat(x: Animal): x is Cat` uses a discriminant. After `throw` or `return`, the remainder is narrowed. `switch (event.type)` with `assertNever` in default.

You rewrite `value && value.foo` to `'foo' in value` for objects so TS and runtime agree.

## Failure modes

Narrowing lost after an awaited call if TS cannot prove the variable is unchanged (aliases). `in` operator on primitives. User-defined type guards that lie. `!` non-null assertions. Discriminant not a literal. Mutating a union object so the tag and payload disagree.

Closures capturing a narrowed variable that later assigns (TS may or may not track).

## When this is the wrong tool

Zod parse at the boundary beats a pile of `typeof` in the core. Do not write 12 guards for a JSON blob — parse once. Narrowing cannot fix `any`. If you need runtime exhaustive checks in JS without TS, use a map of handlers. `as` is not narrowing. For DOM, `instanceof HTMLElement` is the right guard, not `tagName` string compares you forget to maintain.
