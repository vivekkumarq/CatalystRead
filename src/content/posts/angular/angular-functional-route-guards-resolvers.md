---
title: "Functional Route Guards and Resolvers in Angular"
slug: "angular-functional-route-guards-resolvers"
description: "Class-based guards are gone from the recommended path. Here's how functional guards and resolvers actually change route protection and data loading."
publishedAt: "2026-02-23"
updatedAt: "2026-09-16"
category: "Angular"
tags:
  - Angular
  - Routing
  - TypeScript
  - Frontend Engineering
---

Class-based route guards had a specific problem: implementing `CanActivate` meant writing an injectable service, registering it, and threading dependencies through a constructor — for logic that was frequently a single conditional. Functional guards collapse that whole ceremony into a plain function, and resolvers follow the same pattern for pre-fetching route data.

## From Class to Function

```typescript
// Before: a full injectable class for one check
@Injectable({ providedIn: 'root' })
export class AuthGuard implements CanActivate {
  constructor(private auth: AuthService, private router: Router) {}
  canActivate(): boolean | UrlTree {
    return this.auth.isLoggedIn() ? true : this.router.createUrlTree(['/login']);
  }
}

// After: a function
export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  return auth.isLoggedIn() ? true : router.createUrlTree(['/login']);
};
```

Registration in the route config looks nearly identical — you just point at the function instead of the class:

```typescript
export const routes: Routes = [
  {
    path: 'account',
    canActivate: [authGuard],
    loadComponent: () => import('./account.component').then(m => m.AccountComponent),
  },
];
```

Returning `false` cancels navigation entirely; returning a `UrlTree` redirects. Returning an `Observable<boolean>` or `Promise<boolean>` is still fully supported, so async checks — verifying a session with the server, for instance — work exactly as before.

## Composing Guards Instead of Inheriting Them

Because guards are just functions, you can build higher-order guards with ordinary function composition — something that required awkward base classes or mixins with `CanActivate` implementations:

```typescript
function requiresRole(role: string): CanActivateFn {
  return () => {
    const auth = inject(AuthService);
    const router = inject(Router);
    return auth.hasRole(role) ? true : router.createUrlTree(['/forbidden']);
  };
}

export const adminGuard = requiresRole('admin');
export const editorGuard = requiresRole('editor');
```

This is the pattern class-based guards made awkward: a guard factory that parameterizes behavior, reused across multiple routes without subclassing anything.

## Resolvers: Same Shift, Different Payoff

`ResolveFn` mirrors the guard change. A resolver runs before the route activates and makes its return value available via `ActivatedRoute.data`:

```typescript
export const productResolver: ResolveFn<Product> = (route) => {
  const productService = inject(ProductService);
  const id = route.paramMap.get('id')!;
  return productService.getById(id);
};
```

```typescript
export const routes: Routes = [
  {
    path: 'products/:id',
    resolve: { product: productResolver },
    loadComponent: () => import('./product-detail.component').then(m => m.ProductDetailComponent),
  },
];
```

Inside the component, that resolved value arrives through `ActivatedRoute` — or, more conveniently, through the `withComponentInputBinding()` router feature, which maps resolved data straight onto a component input with no manual subscription:

```typescript
@Component({ /* ... */ })
export class ProductDetailComponent {
  product = input.required<Product>(); // populated by the resolver
}
```

## Where Resolvers Still Cost You

Resolvers block navigation until they resolve — the URL doesn't change and the component doesn't render until the data arrives. That's the right trade-off for data the page cannot render without (a product detail page with no product), and the wrong one for anything optional or slow (analytics, a "related items" strip). For the latter, let the component render immediately and fetch inside `ngOnInit` or an effect, showing a loading state instead of stalling the whole navigation.

## Migration Notes

Angular's `CanActivateFn`, `CanDeactivateFn`, `CanMatchFn`, and `ResolveFn` types cover the full guard/resolver surface — there's no functional equivalent missing. Existing class-based guards keep working (they're not deprecated in a breaking sense), so migration is opportunistic: convert a guard when you touch it, rather than in one large sweep. The bigger win comes from guard factories like `requiresRole` above, which usually can't be extracted cleanly from an existing class hierarchy without this shift.

## A worked example

`canActivate` as a function: read `inject(Auth).user()`, return `true` or `Router.parseUrl('/login')`. A resolver returns `inject(Api).order(id)` as a promise; the component reads `input` from `resolve`. Tests call the guard function inside `runInInjectionContext` with a fake Auth.

A `CanMatch` guard keeps a lazy admin chunk from downloading for unauthorized users — stronger than `canActivate` after the download.

## Failure modes

Guards that HTTP-call on every child navigation. Resolvers that never error, leaving the route hanging. Returning `false` instead of a `UrlTree` so the user sees a blank. Order of functional guards vs class guards in mixed routes. Using a resolver for data that should be fetched in the component with `resource()` so it can refresh.

Redirect loops: login guard sends to home, home guard sends to login.

## When this is the wrong tool

Do not put entitlement checks that need the order body in a guard — load the order, then authorize in the service. Guards are the wrong tool for analytics pageviews. Resolvers that block navigation for non-critical widgets hurt INP; defer those. If every route needs the same auth check, an HTTP interceptor plus a single parent route guard is enough. Feature flags in guards can strand users on old URLs — prefer rendering a disabled state.
