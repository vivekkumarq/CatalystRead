---
title: "Template Literal Types in Practice"
slug: "template-literal-types-in-practice"
description: "Template literal types can enforce structure in strings like event names, route params, and object paths — and know exactly where to stop using them."
publishedAt: "2025-08-10"
updatedAt: "2026-09-16"
category: "TypeScript"
tags:
  - Template Literal Types
  - TypeScript
  - Type Safety
  - Frontend Engineering
---

Template literal types look like a party trick the first time you see them — string interpolation, but at the type level — until you hit the specific problem they solve: types that are strings, but not *any* string. An event name, a CSS custom property, a route path — these are all strings with structure, and template literal types let the compiler enforce that structure instead of trusting a comment.

## Typed event names

A common pattern is deriving a set of DOM-style event names from a base list:

```typescript
type BaseEvent = "click" | "focus" | "blur";
type HandlerName = `on${Capitalize<BaseEvent>}`;
// "onClick" | "onFocus" | "onBlur"

function on<E extends BaseEvent>(event: E, handler: () => void) {}

on("click", () => {});   // fine
on("clic", () => {});    // error — not in the union
```

This is more valuable than it looks in a component library: instead of maintaining `onClick`, `onFocus`, `onBlur` as three separately-typed, hand-written props, you derive the prop names from one source list and they can't drift apart.

## Extracting parts of a string with infer

Combined with conditional types, template literals can pull structured pieces out of a string type — the same way `infer` pulls a type out of `Promise<T>`:

```typescript
type ExtractRouteParams<T extends string> =
  T extends `${string}:${infer Param}/${infer Rest}`
    ? { [K in Param | keyof ExtractRouteParams<Rest>]: string }
    : T extends `${string}:${infer Param}`
      ? { [K in Param]: string }
      : {};

type Params = ExtractRouteParams<"/users/:userId/posts/:postId">;
// { userId: string; postId: string }
```

That's a real pattern lifted from typed-router libraries: define the route as a plain string, and the params object is derived from it — no separate params type to keep in sync by hand.

## Type-safe object paths

The other place this earns its keep is dotted-path access — the kind of string you'd pass to a form library or a `get(obj, "user.address.city")` helper:

```typescript
type PathsOf<T, Prefix extends string = ""> = {
  [K in keyof T & string]: T[K] extends object
    ? `${Prefix}${K}` | PathsOf<T[K], `${Prefix}${K}.`>
    : `${Prefix}${K}`;
}[keyof T & string];

interface FormValues {
  user: { name: string; address: { city: string } };
}

type FormPath = PathsOf<FormValues>;
// "user" | "user.name" | "user.address" | "user.address.city"

function getValue<P extends FormPath>(path: P): unknown { /* ... */ }
getValue("user.address.city"); // valid
getValue("user.zip");          // error — not a real path
```

Typo a field name in a form binding and it's a compile error instead of a silently-`undefined` value in production.

## Knowing when to stop

The `PathsOf` type above is genuinely useful, but push it one level further — say, adding array index support or making it work with recursive, self-referencing types — and the error messages TypeScript produces become nearly unreadable walls of nested conditional expansion. That's the signal to back off. If a template literal type needs a comment explaining what it does, or if changing an unrelated part of the codebase suddenly makes `tsc` slow to a crawl on this file, a runtime validator checking the same constraint is often the better trade: weaker compile-time guarantees, but a type signature a teammate can actually read, and an error a user can actually understand.

## A worked example

`type EventName = \`on${Capitalize<string>}\`` is too wide. Prefer `type CssVar = \`--${string}\`` for a lint-level check, or `type Route = \`/users/${string}/orders/${string}\`` for a handful of patterns. `as const` objects plus `keyof` beat parsing arbitrary strings. You extract `UserId` from `` `user:${string}` `` with `infer`.

A test: `const x: `user:${string}` = 'user:12'` passes; `'12'` fails.

## Failure modes

Unions of template literals exploding (each combination). Using them to parse HTML. Recursive templates that freeze the IDE. Over-constraining i18n keys so product cannot add a string without a type PR. Template types that accept `` `user:${any}` `` via `any`.

Expecting runtime checks — these erase.

## When this is the wrong tool

Runtime routers should parse URLs with a library. Do not type every pixel of CSS. If the set is finite, a string union is clearer. Template literals are the wrong tool for email validation. Codegen from a routes file is better than inferring from a giant template. Skip them when the team is fighting the checker more than bugs.

## A worked failure mode

A template literal type is used to parse real URLs; it becomes a 10k-instantiation error and the compiler dies. Runtime still does not validate. The failure is types as parsers. Use templates for small, closed sets (event names); parse URLs at runtime.

Template literal types are the wrong tool for unbounded strings. They will not replace a schema. Use them for autocomplete of finite patterns.

When this pattern is stretched past its assumptions, the first outage looks like a mysterious performance cliff instead of a design limit. "Template Literal Types in Practice" fails that way when traffic mix, data shape, or team skill does not match the blog that sold the approach. Keep a kill switch: feature flag, smaller blast radius, or an older path that still works. Measure the thing the idea claims to improve, not a vanity graph. If you cannot name a workload where you would refuse to use it, you have not finished the design.
