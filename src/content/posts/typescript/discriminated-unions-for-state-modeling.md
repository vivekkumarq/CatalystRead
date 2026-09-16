---
title: "Discriminated Unions for Modeling State You Can Actually Trust"
slug: "discriminated-unions-for-state-modeling"
description: "Replace scattered boolean flags with discriminated unions to make impossible UI and reducer states unrepresentable, not just unlikely."
publishedAt: "2025-11-30"
updatedAt: "2026-09-16"
category: "TypeScript"
tags:
  - TypeScript
  - Discriminated Unions
  - State Management
  - Frontend Engineering
---

Most state bugs I've debugged in production came from state shapes that allowed combinations that should never have existed. `isLoading: true` and `data: [...]` set at the same time. `error` populated while `isSuccess` is also `true`. Nobody wrote that state on purpose — the type system just let it happen, and eventually some code path produced it. Discriminated unions fix this at the type level, not the review-checklist level.

## The boolean-soup problem

A typical first pass at async state looks like this:

```typescript
interface RequestState<T> {
  isLoading: boolean;
  isError: boolean;
  data: T | null;
  error: string | null;
}
```

Nothing here prevents `{ isLoading: true, isError: true, data: someData, error: null }`. That's four independent fields describing what should be one mutually exclusive state, and the number of technically-valid-but-nonsensical combinations grows fast as you add fields. Every consumer of this state has to defensively check combinations that shouldn't exist.

## Modeling it as a union instead

A discriminated union uses a single literal field — the "tag" or "discriminant" — to say which variant you're in, and each variant only carries the fields relevant to it.

```typescript
type RequestState<T> =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; data: T }
  | { status: "error"; error: string };

function render<T>(state: RequestState<T>) {
  switch (state.status) {
    case "idle":
      return "Waiting to start";
    case "loading":
      return "Loading…";
    case "success":
      return state.data; // data only exists here — no null check needed
    case "error":
      return state.error; // same for error
  }
}
```

Inside the `"success"` branch, `state.data` is guaranteed to exist because TypeScript narrows the union based on the `status` check. You never write `state.data!` or a null guard you're not sure is load-bearing. The type system is doing the defensive programming for you.

## Exhaustiveness checking catches the forgotten case

The real payoff shows up when you add a new variant later — say a `"canceled"` status for aborted requests. Without exhaustiveness checking, it's easy to forget to handle it somewhere in a large codebase. Assign the unhandled case to `never` in a default branch, and the compiler tells you exactly where you missed it:

```typescript
function label(state: RequestState<unknown>): string {
  switch (state.status) {
    case "idle": return "Idle";
    case "loading": return "Loading";
    case "success": return "Success";
    case "error": return "Error";
    default: {
      const _exhaustive: never = state;
      return _exhaustive;
    }
  }
}
```

Add `"canceled"` to the union and forget to handle it here, and `state` in the default branch is no longer assignable to `never` — you get a compile error at the exact spot that needs updating, instead of a runtime `undefined` falling through.

## The same pattern applies to reducers

Redux-style reducers and `useReducer` are just discriminated unions on the action side. Give every action a literal `type` field and a payload shape specific to that action, and the reducer's switch statement gets the same narrowing and exhaustiveness benefits:

```typescript
type CartAction =
  | { type: "add"; itemId: string; quantity: number }
  | { type: "remove"; itemId: string }
  | { type: "clear" };
```

You can't accidentally read `action.itemId` on a `"clear"` action — it doesn't type-check. That's not a linting convention; it's structurally impossible, which is exactly the property you want from state that other people will maintain after you.

## A worked example

`type Remote<T> = { status: 'idle' } | { status: 'loading' } | { status: 'ok'; data: T } | { status: 'err'; error: string }`. A switch on `status` makes `data` available only in `'ok'`. You reject `{ loading: boolean; data?: T; error?: string }` because `loading && data` states exist.

Redux/useReducer actions use the same discriminant: `{ type: 'loaded'; payload: T }`.

## Failure modes

Optional discriminant. Two fields as fake discriminant (`success` boolean plus `error`). Forgetting `never` in default to catch unhandled variants. Nested unions without a tag. Serializing to JSON and losing the tag name (`kind` vs `status` mismatch across services).

`as` casts to the happy variant.

## When this is the wrong tool

A single boolean is enough for a checkbox. Classes with methods can be better when behavior varies more than data. Do not union 40 API error codes if a single `AppError` with a code field is enough — unless you need exhaustive UI. Zod discriminated unions at the boundary; interior can use the TS union. If state is a dense grid of flags, a state machine library may be clearer than ad-hoc unions.
