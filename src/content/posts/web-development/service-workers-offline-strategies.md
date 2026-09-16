---
title: "Service Workers and Offline Strategies That Don't Serve Stale Garbage"
slug: "service-workers-offline-strategies"
description: "A service worker with the wrong caching strategy is worse than no service worker at all. Here's how to pick the right one per resource type."
publishedAt: "2026-03-27"
updatedAt: "2026-09-16"
category: "Web Development"
tags:
  - Web Development
  - Service Workers
  - Performance
  - Progressive Web Apps
---

A service worker sits between your app and the network as a programmable proxy, and that power cuts both ways — get the caching strategy wrong and you'll serve users a broken build for weeks after you shipped the fix, because the service worker itself is the thing preventing the fresh version from ever being fetched. The strategy has to match the resource, not be applied uniformly.

## Registration and the Update Trap

```javascript
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js');
  });
}
```

The trap: a service worker doesn't take control of an already-open tab immediately, even after a new version installs — it waits until every tab using the old version closes, by design, to avoid two versions of your app running against incompatible cached assets simultaneously. Users who keep a tab open for days will run stale code until they close it. Handling this deliberately means listening for the `waiting` state and prompting the user, or calling `skipWaiting()` if your app can tolerate an immediate mid-session swap.

```javascript
self.addEventListener('install', (event) => {
  self.skipWaiting(); // only if your app handles an in-place version swap safely
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});
```

## Cache-First for Anything Immutable

Static, hashed build assets — a `main.a3f9c1.js` bundle — never change content once published under that filename, so serving them from cache without even checking the network is correct, not risky:

```javascript
self.addEventListener('fetch', (event) => {
  if (event.request.url.includes('/assets/')) {
    event.respondWith(
      caches.match(event.request).then((cached) => cached || fetch(event.request)),
    );
  }
});
```

This is the strategy where "cache-first" is unambiguously right: a hashed filename means "content changed" implies "URL changed," so a stale cache entry for an old hash is simply irrelevant, never wrong.

## Network-First for Anything That Changes

HTML documents and API responses need the opposite default — check the network first, fall back to cache only when offline, because serving a cached HTML shell or a stale API response as the primary path means users see outdated content by default, with fresh content available but unused:

```javascript
async function networkFirst(request) {
  try {
    const response = await fetch(request);
    const cache = await caches.open('dynamic-v1');
    cache.put(request, response.clone());
    return response;
  } catch {
    const cached = await caches.match(request);
    if (cached) return cached;
    throw new Error('Offline and not cached');
  }
}
```

## Stale-While-Revalidate for the Middle Ground

For content that should feel instant but doesn't need to be perfectly fresh on every load — a product listing, a blog index — serve the cached version immediately while fetching an update in the background for next time:

```javascript
async function staleWhileRevalidate(request) {
  const cache = await caches.open('swr-v1');
  const cached = await cache.match(request);

  const fetchPromise = fetch(request).then((response) => {
    cache.put(request, response.clone());
    return response;
  });

  return cached || fetchPromise;
}
```

This is the strategy most often reached for by default because it feels fast in every case — but it's the wrong default for anything where staleness has real consequences (a price, an inventory count, an auth-gated permission), where network-first belongs instead.

## Cache Versioning Prevents the Slow Leak

Every deploy that changes what gets cached needs a new cache name, with old caches explicitly deleted on activation — otherwise a service worker's cache storage grows indefinitely and never sheds entries from builds that no longer exist:

```javascript
const CACHE_VERSION = 'app-v14';

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_VERSION)
          .map((key) => caches.delete(key)),
      ),
    ),
  );
});
```

## Offline Doesn't Mean "Everything Works"

Realistic offline support means deciding, per feature, what degrades gracefully and what fails honestly. A cached product catalog viewable offline is achievable; a checkout flow that requires a live payment API is not, and the honest answer is a clear "you're offline, this needs a connection" message rather than a form that silently fails to submit. `navigator.onLine` and the `online`/`offline` events let you surface that state proactively instead of letting the user discover it through a failed request.

## A worked failure mode

A service worker caches `index.html` forever; users cannot escape a broken deploy. API POST is cached. Offline fallback is a blank page with no skip-waiting. The failure is a worker without versioning. Precache hashed assets, network-first for HTML, never cache mutations, and a kill switch.

## When this is the wrong tool

A service worker is the wrong tool for a mostly-online internal tool that now has stale bugs. It is not a CDN. Skip it until you need offline or controlled caching you will maintain.

A second, quieter failure is operational: the idea is copied from a talk into a path that has no rollback, no owner, and no metric that would show the invariant breaking. For "Service Workers and Offline Strategies That Don't Serve Stale Garbage", that usually means a Friday deploy with production as the first realistic test. Write down the user-visible symptom, the invariant, and the revert before you scale the pattern. If revert is a data rewrite, you do not have a revert—you have a project. Practice the failure in staging with production-sized data at least once, or you will practice it on customers.
