---
title: "Building Type-Safe API Clients From OpenAPI Schemas"
slug: "type-safe-api-clients-from-openapi-schemas"
description: "Stop hand-maintaining API interfaces that drift from the backend — generate them from OpenAPI and turn breaking changes into compile errors."
publishedAt: "2026-02-22"
updatedAt: "2026-09-16"
category: "TypeScript"
tags:
  - TypeScript
  - API Design
  - OpenAPI
  - Type Safety
---

Every team that hand-writes TypeScript interfaces for a backend API eventually hits the same failure: the backend adds a field, renames one, or makes something nullable, and the frontend interface silently goes stale. Nothing breaks at compile time because nothing connects the two. The fix isn't better discipline — it's removing the manual step entirely by generating types straight from the API's own schema.

## Codegen from the source of truth

If your backend publishes an OpenAPI spec, tools like `openapi-typescript` turn it into a single `.d.ts` file describing every path, method, request body, and response shape, keyed by the literal route strings from the spec:

```typescript
// generated: schema.d.ts (excerpt)
export interface paths {
  "/users/{id}": {
    get: {
      parameters: { path: { id: string } };
      responses: {
        200: { content: { "application/json": components["schemas"]["User"] } };
        404: { content: { "application/json": { message: string } } };
      };
    };
  };
}
```

Run this as part of CI whenever the spec changes, commit the generated file (or fetch it at build time), and the types are never more than one regeneration behind reality. This is meaningfully different from hand-maintained interfaces: there's no human step where drift can be introduced silently.

## Codegen vs runtime validation — they solve different problems

Generated types tell TypeScript what the response *should* look like according to the contract. They don't verify what actually comes back over the wire — a backend bug, a stale deployed version, or a third-party API can still send something that doesn't match the schema, and generated types won't catch that at runtime.

Runtime-validated clients built on something like `zod` solve a different problem: they parse and validate the actual response, and infer the TypeScript type from the validation schema so you get both. The tradeoff is you're maintaining the schema yourself (or generating a zod schema from OpenAPI too, which is more fragile) and paying a real parsing cost on every response.

The pragmatic combination: use OpenAPI-generated types for internal, well-controlled services where you trust the contract, and add runtime validation specifically at boundaries where a mismatch would be dangerous — payment data, anything user-facing, or third-party APIs you don't control the deploy cadence of.

## A typed fetch wrapper keyed off the generated types

The generated `paths` type is a map you can key a wrapper function off of, so callers get autocomplete on valid routes and correct types on both the request and response without writing per-endpoint functions by hand:

```typescript
import type { paths } from "./schema";

type GetPaths = { [K in keyof paths]: paths[K] extends { get: unknown } ? K : never }[keyof paths];

async function apiGet<Path extends GetPaths>(
  path: Path,
  params: paths[Path]["get"]["parameters"]["path"]
): Promise<paths[Path]["get"]["responses"][200]["content"]["application/json"]> {
  const resolved = path.replace(/\{(\w+)\}/g, (_, key) => String((params as Record<string, string>)[key]));
  const res = await fetch(resolved);
  if (!res.ok) throw new Error(`Request to ${path} failed: ${res.status}`);
  return res.json();
}

const user = await apiGet("/users/{id}", { id: "42" });
// user is typed as components["schemas"]["User"] — no manual interface written
```

## Breaking changes become compile errors

The real payoff shows up months later, when the backend team renames a field or removes an endpoint. Regenerate the schema, run `tsc`, and every call site depending on the old shape fails to compile — in the IDE, before a PR, not in production after a customer reports it. That's the entire value proposition: moving an entire category of integration bug from runtime, where it's expensive and embarrassing, to compile time, where it's a five-minute fix with a stack trace pointing exactly at the problem.

## A worked failure mode

A client is generated once and committed; the server adds a required field and the client still compiles because CI does not regen. `any` sneaks in via a poorly typed `additionalProperties`. Runtime still 400s. The failure is types without a pipeline. Generate in CI, fail on spec drift, and treat additionalProperties as unknown.

## When this is the wrong tool

OpenAPI generation is the wrong tool for a one-endpoint internal call. It will not make an untyped backend typed. Do not edit generated files. Use it when the spec is the contract and CI owns the client.

A worked anti-pattern: the team ships the architecture, then staffs it like a toy. "Building Type-Safe API Clients From OpenAPI Schemas" needs boring operations—backups, timeouts, ownership, and a budget for the tax the idea always charges (compaction, replay, dual writes, extra latency, extra types). Unstaffed taxes come due at 2am. Put the tax in the design doc's cost section. If leadership wants the benefit without the tax, the honest answer is a smaller idea, not a heroic on-call rotation.
If a dry-run in staging with production-like volume does not reproduce the benefit, do not scale the idea on a hope and a dashboard. Ship the smaller version that you can revert in one deploy.
