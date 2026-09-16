---
title: "Fetching Async Data with Angular's resource() and httpResource APIs"
slug: "angular-resource-httpresource-apis"
description: "A practical look at how resource() and httpResource replace ad-hoc RxJS pipelines for loading, error, and reload state around async data in Angular."
publishedAt: "2026-05-11"
updatedAt: "2026-09-16"
category: "Angular"
tags:
  - Angular
  - Signals
  - RxJS
  - Frontend Engineering
---

Every Angular app eventually reinvents the same three booleans: `loading`, `error`, and `data`, wired up by hand around an HTTP call inside a subscription. It works, but it's boilerplate you write dozens of times and it's easy to get the cleanup wrong — a stale subscription overwriting fresher data, or a loading flag that never flips back off after an error. `resource()` and `httpResource` fold that whole pattern into a signal-based primitive that tracks its own status.

## The resource() primitive

`resource()` takes a reactive `params` function and a `loader` that returns a promise. Whenever the params signal changes, Angular cancels the in-flight request and kicks off a new one automatically — no manual `switchMap` required.

```typescript
import { resource, signal } from '@angular/core';

export class UserProfileComponent {
  userId = signal(1);

  userResource = resource({
    params: () => ({ id: this.userId() }),
    loader: async ({ params, abortSignal }) => {
      const res = await fetch(`/api/users/${params.id}`, { signal: abortSignal });
      if (!res.ok) throw new Error(`Failed to load user ${params.id}`);
      return res.json() as Promise<User>;
    },
  });
}
```

The template reads `userResource.value()`, `userResource.isLoading()`, and `userResource.error()` directly as signals, so change detection only re-renders when one of those actually changes. The `abortSignal` is wired to the request lifecycle automatically, so a fast-typing user switching between three profiles in a row never races a stale response into the UI.

## httpResource for HttpClient users

If your app already leans on `HttpClient` for interceptors — auth headers, retry logic, request logging — `httpResource` gives you the same reactive shape without dropping down to `fetch`.

```typescript
import { httpResource } from '@angular/common/http';

searchQuery = signal('');

results = httpResource<SearchResult[]>(() => ({
  url: '/api/search',
  params: { q: this.searchQuery() },
}));
```

Returning `undefined` from the reactive function skips the request entirely, which is a clean way to gate a search-as-you-type resource behind a minimum query length:

```typescript
results = httpResource<SearchResult[]>(() =>
  this.searchQuery().length < 2 ? undefined : { url: '/api/search', params: { q: this.searchQuery() } }
);
```

## Reloading and mutating

`resource()` exposes `.reload()` for explicit refetch after a mutation, and `.set()` / `.update()` for optimistic updates without waiting on the server round trip:

```typescript
async function saveName(name: string) {
  userResource.update(current => current && { ...current, name }); // optimistic
  await api.updateUser(userId(), { name });
  userResource.reload(); // reconcile with server truth
}
```

## Where RxJS still wins

Resources are built for request/response data tied to reactive parameters — they are not a replacement for RxJS operators like `debounceTime`, `merge`, or WebSocket streams. For a live ticking price feed or a debounced autocomplete that needs `switchMap` semantics with cancellation windows, keep the Observable and convert only at the template boundary with `toSignal`. Reach for `resource()` when the shape of the problem is "fetch this thing when these params change," and keep RxJS for genuinely event-driven streams — mixing the two idiomatically is far more maintainable than forcing everything through one abstraction.

## A worked example

`order = resource({ request: () => this.id(), loader: ({ request }) => fetchOrder(request) })`. Template uses `order.value()`, `order.isLoading()`, `order.error()`. Changing `id` reloads. `httpResource` wraps `HttpClient` with the same shape. You abort in-flight loads when the request key changes.

A unit test stubs the loader and asserts that setting id twice with the same value does not double-fetch if you configured equality.

## Failure modes

Using `resource` for POST/DELETE mutations. Ignoring errors so the UI shows an empty value. Race: slow response for id=1 overwrites id=2 if abort is missing. Calling the loader outside Angular's notification so the view stays stale in zoneless mode. Mixing `async` pipe on Observables and `resource` on the same screen without a single loading story.

`httpResource` with interceptors that retry POST accidentally if someone reuses it.

## When this is the wrong tool

TanStack Query-style shared caches across many screens may still want a dedicated library. `resource` is the wrong tool for WebSocket streams (use `toSignal`). Do not replace a simple `signal` plus one `http.get` in a tiny widget if you do not need reload-on-key. Server-side mutation belongs in an action, not a resource loader. If you need optimistic lists with rollback, you will write extra code; a mutation library may fit better.

## A worked failure mode

A page uses `httpResource` keyed only on a route param. The user edits a filter signal; the resource does not reload because the request factory closed over the initial filter. A second bug: error state is ignored and the template reads `.value()` as if it were always data, throwing in the overlay. Reloads stack because a computed dependency flips every CD cycle (new object in the params). The failure is treating resource as magic GraphQL. Put every input the request needs in the resource params, handle error/loading branches, and stabilize identities.

`resource()` is the wrong tool for a fire-and-forget POST with no read model, or for websocket streams. Do not replace a well-tested NgRx effect with resources if you need complex orchestration. It is the wrong abstraction for uploads with progress. Use it for request/response data that should stay in sync with signals; keep mutations explicit.

When this pattern is stretched past its assumptions, the first outage looks like a mysterious performance cliff instead of a design limit. "Fetching Async Data with Angular's resource() and httpResource APIs" fails that way when traffic mix, data shape, or team skill does not match the blog that sold the approach. Keep a kill switch: feature flag, smaller blast radius, or an older path that still works. Measure the thing the idea claims to improve, not a vanity graph. If you cannot name a workload where you would refuse to use it, you have not finished the design.
