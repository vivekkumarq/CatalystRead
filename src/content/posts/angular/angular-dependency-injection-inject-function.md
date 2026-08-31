---
title: "Angular DI After inject(): What Actually Changed"
slug: "angular-dependency-injection-inject-function"
description: "The inject() function didn't just shorten constructors — it decoupled dependency lookup from class instantiation entirely, and that changes what's possible."
publishedAt: "2026-02-09"
category: "Angular"
tags:
  - Angular
  - Dependency Injection
  - TypeScript
  - Frontend Engineering
---

Constructor injection was, for most of Angular's history, the only way to pull a dependency out of the injector. It worked, but it tied dependency resolution to class construction — you could only inject things inside a constructor, and only inside classes. `inject()` breaks that coupling, and the consequences go well beyond saving a few lines of constructor boilerplate.

## The Obvious Win: Less Ceremony

```typescript
// Before
@Component({ /* ... */ })
export class UserProfile {
  constructor(
    private readonly userService: UserService,
    private readonly router: Router,
    private readonly destroyRef: DestroyRef,
  ) {}
}

// After
@Component({ /* ... */ })
export class UserProfile {
  private readonly userService = inject(UserService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
}
```

This alone is a real improvement for classes with many dependencies — no more scrolling past ten constructor parameters to find the actual logic, and no risk of a property forgetting to match its constructor parameter name. But it's a side effect, not the point.

## The Real Change: Injection Outside Constructors

`inject()` works anywhere that runs inside an *injection context* — which includes field initializers, but also factory functions passed to providers, route guards, resolvers, and app initializers. That's the meaningful shift: dependency injection is no longer exclusively a class feature.

```typescript
export const authGuard: CanActivateFn = (route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  return auth.isAuthenticated() ? true : router.createUrlTree(['/login']);
};
```

A guard used to require a class with a `canActivate` method and its own constructor just to get a hold of `AuthService`. Now it's a plain function. The same applies to resolvers, `HTTP_INTERCEPTORS` written as functions, and `provideAppInitializer`.

## Composable Injection Logic

Because `inject()` is just a function call inside an injection context, you can wrap it in your own helper and reuse that helper across components — something constructor injection could never express cleanly:

```typescript
function injectCurrentUser() {
  const auth = inject(AuthService);
  return toSignal(auth.currentUser$, { initialValue: null });
}

@Component({ /* ... */ })
export class Header {
  currentUser = injectCurrentUser();
}
```

This pattern — sometimes called a "composable" or "inject function," borrowed conceptually from Vue's composables and React hooks — lets you extract cross-cutting logic (a debounced query param, a media query listener, a feature flag check) into a reusable unit that still participates in DI, without writing a service class for every single one.

## The Rule You Cannot Break

`inject()` only works synchronously, at the top level of an injection context. This fails silently in confusing ways if you get it wrong:

```typescript
@Component({ /* ... */ })
export class Bad {
  ngOnInit() {
    // Throws: inject() must be called from an injection context
    const service = inject(SomeService);
  }
}
```

The fix is always the same: call `inject()` during field initialization or the constructor body, store the result, and use the stored reference later. If you need injection inside a callback or an async function, capture the dependency beforehand:

```typescript
export class Bad {
  private readonly service = inject(SomeService); // capture here
  ngOnInit() {
    this.service.load(); // use here
  }
}
```

## When to Still Use a Constructor

`inject()` doesn't deprecate constructor injection — for a simple component with one or two dependencies, a constructor is still perfectly idiomatic and arguably more discoverable to newcomers. Reach for `inject()` when you're writing functional guards/resolvers/interceptors, when you want to extract composable logic, or when a large constructor's parameter list has become the least readable part of the file.
