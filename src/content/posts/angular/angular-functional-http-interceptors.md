---
title: "Functional HTTP Interceptors: A Pipeline You Can Test Without a Module"
slug: "angular-functional-http-interceptors"
description: "How interceptors chain, where to attach auth headers and correlation IDs, and how to write a retry interceptor that does not duplicate POSTs."
publishedAt: "2026-09-05"
updatedAt: "2026-09-16"
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

## A retry interceptor that does not charge twice

Idempotent reads can retry. Writes need a key the server honors, not three identical POSTs.

```typescript
export const IDEMPOTENT = new HttpContextToken(() => false);

export const retrySafe: HttpInterceptorFn = (req, next) => {
  const canRetry =
    req.method === "GET" || req.context.get(IDEMPOTENT);
  if (!canRetry) return next(req);
  return next(req).pipe(retry({ count: 2, delay: 400 }));
};
```

The caller that *knows* the payment API keys on `Idempotency-Key` sets the context token and the header together. The interceptor must not invent that story from a URL prefix. Prefixes rot when a BFF remaps `/pay` to `/v2/charges`.

Error mapping belongs after retries: map 401 to a refresh-and-replay only if the original request was not the refresh, and clone with a new header rather than mutating `req`. Mutating the incoming request object is a shared-state bug when two subscribers exist.

## Failure modes

**Interceptor recursion.** Token refresh through the same `HttpClient` re-enters auth, correlation, and logging interceptors. Use `HttpBackend` or a second `provideHttpClient` without the auth interceptor for the refresh call.

**Order bugs.** Logging that reads the body before `next` can consume a stream; cloning too late drops a header another interceptor needed. Keep interceptors small: clone, set headers, call `next`, optionally `catchError`. Body inspection belongs in a debug-only interceptor behind a flag.

**Retry on `progress` events.** `HttpClient` emits upload/download events. `retry` without filtering `HttpEvent` types can retry on a progress tick. Retry on `HttpErrorResponse` (or `filter` for the final response) so a large upload is not restarted because a progress event looked like a failure.

**SSR.** Interceptors that touch `window` or `localStorage` for tokens crash the server render. Inject a platform-safe token store; on the server, skip auth headers or use a request-scoped cookie reader.

## When not to use an interceptor

Per-endpoint base URLs, GraphQL operation names, and “this SKU hits warehouse B” are service concerns. A cache interceptor that tries to be Redis for every GET will hide POST side effects and serve stale user-specific JSON. If you need a cache, key it on auth identity and make opt-in via `HttpContext`.

## Review checklist

- Array order is documented: correlation → auth → retry → error map → logging.
- POSTs retry only with an explicit context token and idempotency header.
- Refresh traffic uses a client without the auth interceptor.
- One unit test per interceptor with a fake `next`; one `HttpTestingController` test for the chain.
