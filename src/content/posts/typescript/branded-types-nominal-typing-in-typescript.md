---
title: "Branded Types: Nominal Identity in a Structural Type System"
slug: "branded-types-nominal-typing-in-typescript"
description: "How to stop mixing user IDs and order IDs, when brands beat extra classes, and the limits of compile-time branding at runtime."
publishedAt: "2026-08-14"
updatedAt: "2026-09-16"
category: "TypeScript"
tags:
  - TypeScript
  - Type System
  - API Design
  - Safety
---

TypeScript compares shapes, not names. Two aliases of `string` are the same type, so a function that wants a user id will happily take an order id. That is convenient until it is a production incident. Branded types (also called opaque types or nominal wrappers) reintroduce a distinction the compiler can see, without paying for a class instance at runtime.

## A brand that stays a string after compile

The usual pattern intersects a primitive with a unique object tag:

```typescript
declare const UserIdBrand: unique symbol;
export type UserId = string & { readonly [UserIdBrand]: "UserId" };

declare const OrderIdBrand: unique symbol;
export type OrderId = string & { readonly [OrderIdBrand]: "OrderId" };

export function asUserId(raw: string): UserId {
  if (!raw) throw new Error("empty user id");
  return raw as UserId;
}

function fetchUser(id: UserId) { /* ... */ }

const order = "ord_123" as OrderId;
// fetchUser(order) // error: OrderId is not assignable to UserId
```

`unique symbol` matters. A shared string tag like `{ __brand: "id" }` collapses; two brands with the same property type start mixing again.

Validation belongs in the constructor (`asUserId`), not at every call site. The type is a promise that *someone* already checked the format. If you cast at the edge of a JSON parse without checking, you paid for theater.

## Where brands earn their keep

- IDs of different entities
- tokens that must not be logged (`SecretString`)
- units (`Cents` vs `Dollars`) where mixing is a billing bug
- sanitized HTML vs raw strings

Where they do not: wrapping every DTO field. You will fight every library that expects `string`, and you will `as` your way back to unsafety.

## Runtime is still structural

After compile, `UserId` is a string. `JSON.stringify`, Redis, and Postgres will not preserve the brand. Boundary modules — HTTP handlers, queue consumers — are where you parse and brand. Interior functions can assume the invariant.

Libraries like `zod` can output branded types from a schema so the parse function is the only cast. That pairing (schema + brand) is stronger than brands alone, because invalid strings never enter the typed interior.

If a junior engineer cannot tell why two string aliases exist, the brand is doing product work: it encodes a domain distinction that reviews used to catch by luck.

## A worked example

`transfer(from: AccountId, to: AccountId, amount: Cents)` should not accept a user id or a dollar float. Define `Cents` as a branded integer and parse at the HTTP edge:

```typescript
function asCents(n: number): Cents {
  if (!Number.isInteger(n) || n < 0) throw new Error("cents");
  return n as Cents;
}
```

A test that `transfer(userId, accountId, 10.5)` fails to compile is the payoff. At runtime, a Fastify preValidation hook runs `asAccountId` on params. Interior ledger code never sees raw strings.

For secrets, `type Redacted = string & { readonly [SecretBrand]: "redacted" }` plus a `toLog(): string` that returns `***` prevents accidental interpolation in `console.log` if you only log via that helper — remember the brand itself will not stop `String(secret)`.

## Failure modes

`as UserId` on unparsed JSON reintroduces the bug. Two packages each define `UserId` with their own `unique symbol`; they are incompatible, which is good, until someone adds a shared cast helper that uses `as any`. Generic `id: T` that accepts both brands because `T extends string` erases the distinction. `structuredClone` and `JSON.parse` return plain strings.

Over-branding (`FirstName`, `LastName`) makes every mapper a cast festival and people stop trusting the compiler.

## When this is the wrong tool

If the values are already different TypeScript types (`number` vs `string`), you do not need a brand. Classes or private-constructor wrappers are better when you need runtime methods and prototype identity. Brands are the wrong tool for validating nested payloads — use a schema library, optionally with brand output. Do not brand IDs in a codebase that constantly concatenates SQL strings; fix the query layer. If a third-party SDK demands `string`, keep the brand inside your module and unwrap once at the SDK call, documented as a boundary.

## Review checklist

- Brands use `unique symbol`, not a shared `{ __brand: string }`.
- Parse/construct at HTTP and queue edges; no `as Brand` on raw JSON.
- Runtime checks live in the constructor; interior code trusts the type.
- Brands are reserved for mix-ups that cost money or safety, not every DTO field.

## A worked failure mode

`UserId` and `OrderId` are branded then `as UserId` is used on a string from the URL without parsing. Brands are stripped by a generic `T` that was not preserved. JSON round-trips lose brands (expected) and the code still trusts them. The failure is a brand without a constructor. Parse at the edge; do not assert.

Brands are the wrong tool if you have one id type in the whole app. They do not survive untyped JSON. Use them to stop mixing identifiers you actually mix up.

The wrong-tool test is easier with a concrete customer. If a user can lose money, lose access, or see someone else's data when "Branded Types: Nominal Identity in a Structural Type System" is slightly misapplied, do not let the pattern ride on defaults. Tighten the API, add an assertion in CI, and refuse silent fallbacks that look like success. Most production failures here are not exotic; they are a missing bound, a missing key, or a missing check that the original paper assumed a careful operator would have.
