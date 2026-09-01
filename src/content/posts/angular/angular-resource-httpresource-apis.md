---
title: "Fetching Async Data with Angular's resource() and httpResource APIs"
slug: "angular-resource-httpresource-apis"
description: "A practical look at how resource() and httpResource replace ad-hoc RxJS pipelines for loading, error, and reload state around async data in Angular."
publishedAt: "2026-05-11"
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
