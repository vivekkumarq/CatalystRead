---
title: "unknown vs any vs never: Picking the Right Escape Hatch"
slug: "unknown-vs-any-vs-never-in-typescript"
description: "any, unknown, and never look like the same category of weird type but do opposite jobs — here's when each one is actually the right choice."
publishedAt: "2025-10-05"
updatedAt: "2026-09-16"
category: "TypeScript"
tags:
  - TypeScript
  - Type Safety
  - Error Handling
---

`any`, `unknown`, and `never` get lumped together as "the weird TypeScript types," but they're not variations on a theme — they sit at opposite ends of the type system. `any` turns type checking off. `unknown` keeps it on but admits you don't yet know what you have. `never` says a value can't exist at all. Mixing them up doesn't just read badly, it removes safety you thought you had.

## any: the type system holding its own coat

`any` is assignable to and from everything, which means it silently defeats every check downstream of it:

```typescript
function parseConfig(json: string) {
  const data: any = JSON.parse(json);
  return data.settings.theme; // no error, even if settings doesn't exist
}
```

The danger isn't the explicit `any` — that's at least visible in a code review. It's implicit `any`, which shows up whenever a function parameter or a `JSON.parse` result isn't given a type and `noImplicitAny` isn't catching it. Turn that flag on if it isn't already; it's the single highest-value strictness setting for stopping `any` from spreading through a codebase unnoticed.

## unknown: the same job, minus the trust

`unknown` accepts any value, same as `any`, but you can't do anything with it until you narrow it:

```typescript
function parseConfig(json: string): string {
  const data: unknown = JSON.parse(json);
  return (data as any).settings.theme; // possible, but you had to ask for it explicitly
}

function parseConfigSafely(json: string): string {
  const data: unknown = JSON.parse(json);
  if (
    typeof data === "object" &&
    data !== null &&
    "settings" in data &&
    typeof (data as { settings: unknown }).settings === "object"
  ) {
    return (data as { settings: { theme: string } }).settings.theme;
  }
  throw new Error("invalid config shape");
}
```

That's more code, and it should be — a `JSON.parse` result really is an unverified shape, and `unknown` forces you to prove what it is before you use it, ideally with a runtime validator rather than hand-rolled guards for anything beyond a couple fields.

The other place `unknown` matters is `catch` blocks. Since TypeScript 4.4, catch variables can be typed `unknown` (and should be, via `useUnknownInCatchVariables`), because a thrown value in JavaScript can be literally anything, not just an `Error`:

```typescript
try {
  riskyOperation();
} catch (err: unknown) {
  if (err instanceof Error) {
    console.error(err.message);
  } else {
    console.error("Unknown error", err);
  }
}
```

## never: the type with no values

`never` isn't "no type specified" — it's "this can never happen." A function that always throws returns `never`, not `void`:

```typescript
function fail(message: string): never {
  throw new Error(message);
}
```

The more common place `never` earns its keep is exhaustiveness checking in a switch statement over a union:

```typescript
type Status = "idle" | "loading" | "error";

function label(status: Status): string {
  switch (status) {
    case "idle": return "Idle";
    case "loading": return "Loading...";
    case "error": return "Error";
    default:
      const exhaustive: never = status;
      return exhaustive;
  }
}
```

If someone later adds `"success"` to the `Status` union and forgets to handle it here, `status` in the default branch is no longer assignable to `never`, and the build fails at the exact call site that needs updating, instead of silently falling through to a default label at runtime.

## Picking between them

The practical rule: default to `unknown` at any boundary where data enters your program from outside its control — API responses, `JSON.parse`, `catch` blocks, `postMessage` payloads. Reach for `never` deliberately, mostly in exhaustiveness checks and to mark functions that don't return. And treat every `any` you write, or that you find already in the codebase, as a TODO: either narrow it to `unknown` and add the check, or replace it with the real type now that you know what the value actually is.

## A worked failure mode

JSON.parse is typed as `any` and properties are read without guards; runtime is a string. `never` is asserted to silence exhaustiveness. `unknown` is immediately cast to a domain type. The failure is escape hatches as habits. Parse with a validator, use `never` for true exhaustiveness, and narrow `unknown`.

## When this is the wrong tool

`any` is the wrong default. `unknown` is the wrong end state if you never narrow. `never` is the wrong annotation for a function that returns. Use `unknown` at boundaries, `never` for impossible, and keep `any` rare and named.

Copy-paste from an internal success is still a failure mode. The last team had different traffic, a different datastore, and six months of scars. "unknown vs any vs never: Picking the Right Escape Hatch" should be adopted with the scars attached: the dashboard they wished they had, the migration they feared, the incident that made the rule. If those artifacts are missing, you are adopting a slide. Spend a day interviewing the last on-call before you spend a quarter implementing their diagram.
