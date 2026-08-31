---
title: "The TypeScript Strictness Flags Actually Worth Turning On"
slug: "typescript-strictness-flags-worth-enabling"
description: "A practical walkthrough of the compiler flags beyond strict: true that catch real bugs, plus how to adopt them on a large legacy codebase."
publishedAt: "2025-12-28"
category: "TypeScript"
tags:
  - TypeScript
  - Strict Mode
  - Type Safety
  - Developer Tooling
---

`strict: true` is table stakes at this point — if a codebase doesn't have it on, that's usually the first thing worth fixing. But there's a second tier of flags that `strict` doesn't include, each catching a specific category of bug that slips through even a fully strict-mode project. Here's what each one actually does, with the failure it prevents.

## noUncheckedIndexedAccess

This is the highest-value flag most teams haven't enabled. Without it, indexing into an array or a `Record` returns the value type directly, even though the index might be out of bounds.

```typescript
const users: Record<string, { name: string }> = {};
const user = users["missing-id"]; // typed as { name: string }, not undefined
console.log(user.name); // runtime crash, no compile error
```

With `noUncheckedIndexedAccess` on, `users["missing-id"]` is typed as `{ name: string } | undefined`, forcing you to handle the missing case before accessing `.name`. This flag alone catches an enormous number of "cannot read property of undefined" bugs before they ship.

## exactOptionalPropertyTypes

By default, an optional property `foo?: string` actually means `string | undefined`, and TypeScript treats explicitly setting it to `undefined` the same as omitting it. That distinction matters when the presence of a key changes behavior downstream — for example, a `PATCH` payload where omitting a field means "don't touch it" but `undefined` means "clear it."

```typescript
interface UpdateUser {
  nickname?: string;
}

const patch: UpdateUser = { nickname: undefined }; // allowed without the flag
```

With `exactOptionalPropertyTypes`, that assignment is an error unless the type explicitly says `nickname?: string | undefined`. It forces you to be deliberate about the difference between "absent" and "explicitly empty," which matters far more in API payloads than most teams initially assume.

## noImplicitOverride

In a class hierarchy, nothing by default tells you when a subclass method is meant to override a base class method versus accidentally colliding with the same name. Rename the base method and the subclass's version silently stops overriding anything — it's now just an unrelated method with the same name.

```typescript
class Base {
  serialize(): string { return "{}"; }
}

class Derived extends Base {
  override serialize(): string { return "{...}"; } // must say `override`
}
```

With `noImplicitOverride`, forgetting the `override` keyword on a method that does override a base method is an error, and using `override` on a method that doesn't actually override anything is also an error. Both directions matter — the second one is what catches the rename-broke-my-subclass scenario.

## noPropertyAccessFromIndexSignature

This one is more about intent than safety. It forces you to use bracket notation (`obj["dynamicKey"]`) for properties that only exist via an index signature, reserving dot notation for properties that are explicitly declared. It's a smaller win, but it makes it obvious at a glance which property accesses are "known and guaranteed" versus "dynamic and possibly absent."

## Adopting these incrementally

On a large existing codebase, don't flip all of these at once — the error count from `noUncheckedIndexedAccess` alone can run into the thousands on a codebase that leaned on array/object indexing casually. The practical path:

- Enable one flag at a time, starting with `noUncheckedIndexedAccess` since it has the best bug-to-noise ratio.
- Use `// @ts-expect-error` with a tracked follow-up comment on genuinely hard call sites rather than blanket-disabling the flag.
- If your build supports per-directory `tsconfig.json` overrides, enable new flags in newer directories first and expand outward — new code shouldn't inherit old laxity while you migrate the rest.

Treat the error count from a newly enabled flag as a backlog, not a blocker — most of it is real bugs that were previously invisible, not false positives.
