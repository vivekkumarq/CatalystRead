---
title: "Branded Types: Nominal Identity in a Structural Type System"
slug: "branded-types-nominal-typing-in-typescript"
description: "How to stop mixing user IDs and order IDs, when brands beat extra classes, and the limits of compile-time branding at runtime."
publishedAt: "2026-08-14"
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
