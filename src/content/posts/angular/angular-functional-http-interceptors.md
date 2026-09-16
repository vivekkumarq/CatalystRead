---
title: "Functional HTTP Interceptors: A Pipeline You Can Test Without a Module"
slug: "angular-functional-http-interceptors"
description: "How interceptors chain, where to attach auth headers and correlation IDs, and how to write a retry interceptor that does not duplicate POSTs."
publishedAt: "2026-09-05"
category: "Angular"
tags:
  - Angular
  - HTTP
  - RxJS
  - Security
---

Class-based interceptors worked, but they pulled Angular DI into a `providedIn` story that was easy to mis-order. Functional interceptors are `(req, next) => Observable<HttpEvent<unknown>>`. You register them with `withInterceptors([...])` on `provideHttpClient`. Order is the array order: first interceptor sees the request first, and last sees the response first on the way back — like middleware.

## A header interceptor that stays boring

```typescript
export const correlationInterceptor: HttpInterceptorFn = (req, next) => {
  const id = req.context.get(CORR_ID) ?? crypto.randomUUID();
  return next(req.clone({ setHeaders: { 'X-Request-Id': id } }));
};
```

Keep auth token reads inside the interceptor, from a signal or a small `AuthStore`, not from a giant service that imports the whole app. If the token refresh itself uses `HttpClient`, give it `HttpBackend` or a dedicated client without interceptors, or you will recurse until the tab dies.

## Retry is where people duplicate charges

Retry GET/HEAD on 502/503 with backoff. Do not retry POST unless the API is idempotent and you send an idempotency key. An interceptor that `retry(3)` on every method is a billing incident with extra steps.

```typescript
export const retryGets: HttpInterceptorFn = (req, next) => {
  if (req.method !== 'GET') return next(req);
  return next(req).pipe(
    retry({ count: 2, delay: 400 }),
  );
};
```

## Testing without TestBed gymnastics

Functional interceptors are functions. Pass a fake `next` that returns `of(new HttpResponse({ body: {} }))` and assert the cloned request. You still want one integration test with `HttpTestingController` for the auth+retry combination, because order bugs only show up when two interceptors both clone.

Context tokens (`HttpContext`) are the right way to opt a single call out of retry or logging, rather than URL substring checks that break when a gateway prefix changes.

Think of interceptors as a network policy layer: correlation, auth, caching headers, error mapping. Business branching ("if this SKU then that backend") belongs in a data-access service. Mixing the two produces interceptors nobody dares to touch.
