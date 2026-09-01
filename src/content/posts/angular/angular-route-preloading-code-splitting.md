---
title: "Route Preloading Strategies and Code Splitting in Angular"
slug: "angular-route-preloading-code-splitting"
description: "How Angular's router preloading strategies work under the hood, and how to combine them with lazy-loaded routes for faster perceived navigation."
publishedAt: "2026-06-08"
category: "Angular"
tags:
  - Angular
  - Router
  - Performance
  - Code Splitting
---

Lazy loading routes is the easy win — split each feature into its own chunk, load it on navigation, and your initial bundle shrinks dramatically. The harder problem is the gap it creates: the user clicks a link and now waits on a network request that didn't need to happen at that exact moment. Preloading strategies close that gap by fetching chunks ahead of navigation, during idle time the browser would otherwise waste.

## Lazy loading as the baseline

Standalone routing makes this a one-line change per route, using dynamic `import()`:

```typescript
export const routes: Routes = [
  {
    path: 'reports',
    loadComponent: () => import('./reports/reports.component').then(m => m.ReportsComponent),
  },
  {
    path: 'settings',
    loadChildren: () => import('./settings/settings.routes').then(m => m.SETTINGS_ROUTES),
  },
];
```

Each `loadComponent` or `loadChildren` target becomes its own chunk at build time. That's necessary but not sufficient — without a preloading strategy, every one of those chunks only starts downloading the instant the user navigates to it.

## PreloadAllModules and its limits

The built-in `PreloadAllModules` strategy preloads every lazy route in the background right after the app boots:

```typescript
provideRouter(routes, withPreloading(PreloadAllModules));
```

This is fine for small-to-medium apps where the total lazy payload is modest. It falls apart for large apps with dozens of feature modules, because you end up downloading code for routes the current user session will never visit — an admin panel preloaded for a user who's never seen the admin link, competing for bandwidth with the chunk they actually need next.

## Custom strategies based on route data

A custom `PreloadingStrategy` lets you opt routes in selectively via route data, which is the pattern that scales:

```typescript
@Injectable({ providedIn: 'root' })
export class SelectivePreloadStrategy implements PreloadingStrategy {
  preload(route: Route, load: () => Observable<unknown>): Observable<unknown> {
    return route.data?.['preload'] ? load() : of(null);
  }
}
```

```typescript
{
  path: 'reports',
  loadComponent: () => import('./reports/reports.component').then(m => m.ReportsComponent),
  data: { preload: true },
}
```

This gives product-level control: mark the two or three routes users hit most often as `preload: true`, and leave rare paths — settings, an admin section, a rarely used export flow — to load on demand.

## Going further: network-aware and idle-time preloading

You can layer the Network Information API into the strategy to skip preloading on `save-data` or slow connections, and use `requestIdleCallback` so preload requests never compete with the main thread during active interaction:

```typescript
preload(route: Route, load: () => Observable<unknown>): Observable<unknown> {
  const connection = (navigator as any).connection;
  if (connection?.saveData || !route.data?.['preload']) return of(null);

  return new Observable(subscriber => {
    const id = requestIdleCallback(() => load().subscribe(subscriber));
    return () => cancelIdleCallback(id);
  });
}
```

## Pairing with @defer for sub-route granularity

Route-level splitting handles navigation boundaries, but a single route can still ship a heavy component that isn't needed on first paint — a chart library behind a tab, for instance. `@defer` blocks split further within a route, so the two mechanisms aren't competing; router preloading gets the next screen's shell ready, and `@defer` trims what's inside it until it's actually visible or interacted with.
