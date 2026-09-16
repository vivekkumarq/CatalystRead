---
title: "Angular linkedSignal and resource: Derived State That Can Be Written, Async That Is a Signal"
slug: "angular-signals-linkedsignal-resource"
description: "linkedSignal for writable derived state, resource() for async, and how they compose with computed without recreating NgRx for a form."
publishedAt: "2026-08-31"
category: "Angular"
tags:
  - Angular
  - Signals
  - RxJS
  - State
sources:
  - title: "linkedSignal"
    publisher: "Angular docs"
    url: "https://angular.dev/guide/signals/linked-signal"
  - title: "resource"
    publisher: "Angular docs"
    url: "https://angular.dev/guide/signals/resource"
---

Angular signals started as `signal`, `computed`, and `effect`. **`linkedSignal`** fills a hole: state that is **mostly derived** from a source but can be **overridden** locally (a selected id that resets when the list identity changes, a pagination index that should clamp when the page size changes). **`resource`** (and `rxResource`) models async: you give a request function tied to signals, you get `value`, `status`, `error`, and reload — without stuffing `subscribe` into constructors.

## linkedSignal is not a writable computed

`computed` is read-only. If you tried to keep a `selectedId` in sync with `items()` by effect-writing another signal, you raced. `linkedSignal` takes a computation that produces the next value when sources change, and still exposes `set`/`update` for user edits.

```ts
const items = signal<Item[]>([]);
const selected = linkedSignal({
  source: items,
  computation: (list, prev) => list.find(i => i.id === prev()?.id) ?? list[0],
});
```

Use it for UI selection, form drafts that reset on entity change, and "default but overridable" feature flags in a session. Do not use it as a global store for server data; that is `resource` or a proper cache.

## resource is async as signals

```ts
const id = signal('42');
const user = resource({
  request: () => ({ id: id() }),
  loader: async ({ request }) => fetchUser(request.id),
});
```

Template: `user.value()`, `user.isLoading()`. Abort and race handling belong in the loader (`AbortSignal` is passed in recent APIs — read your version). `rxResource` wraps Observables for HTTP you already have.

Waterfalls: a resource that depends on another resource's value will chain. For parallel, don't nest requests in series without need. Errors: show them; silent `undefined` is how you ship empty screens.

## With the rest of Angular

Signals work with `OnPush` and zoneless. `resource` does not replace TanStack Query for infinite cache graphs; it replaces the `ngOnInit` subscribe boilerplate for page-local data. `linkedSignal` plus `resource` covers a surprising amount of CRUD screens.

Read the Angular.dev pages for your exact version (these APIs moved through experimental). Then delete an effect that only existed to copy `computed` into a writable signal. That effect was the smell `linkedSignal` was specified to remove.
