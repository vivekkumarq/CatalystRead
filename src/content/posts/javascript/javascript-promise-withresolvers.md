---
title: "Promise.withResolvers: The Deferred You Used to Write Wrong"
slug: "javascript-promise-withresolvers"
description: "Promise.withResolvers() as standard library: one promise, exposed resolve/reject, and the queue/test patterns that no longer need a Deferred class."
publishedAt: "2026-09-11"
category: "JavaScript"
tags:
  - JavaScript
  - Promises
  - Async
  - ECMAScript
sources:
  - title: "Promise.withResolvers()"
    publisher: "MDN"
    url: "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/withResolvers"
  - title: "TC39 Promise.withResolvers"
    publisher: "TC39"
    url: "https://github.com/tc39/proposal-promise-with-resolvers"
---

The "deferred" pattern — construct a Promise and keep `resolve`/`reject` outside the executor — showed up in every test helper and message queue. People wrote it with `let resolve` in an outer scope, mistyped types, or subclassed Promise. **`Promise.withResolvers()`** returns `{ promise, resolve, reject }` from the standard library. Same semantics, no custom class.

## Where it is the right shape

A gate: wait until an event fires.

```js
const { promise, resolve } = Promise.withResolvers();
button.addEventListener('click', resolve, { once: true });
await promise;
```

A queue: each waiter has a deferred; a producer resolves the next. A protocol: map correlation ids to resolvers, resolve on the matching response, reject on timeout. That last one **must** delete the map entry; leaking resolvers is a memory leak.

Don't use withResolvers when `new Promise(async (resolve) => …)` was already wrong (async executor). Don't use it to wrap callbacks that `util.promisify` already handles.

## Errors

`reject` without `await promise.catch` is an unhandled rejection if nobody awaits. Same as any Promise. TypeScript: `Promise.withResolvers<T>()` types `resolve` with `T`.

Polyfill for older runtimes is a few lines; prefer the native method in Node 22+ / modern browsers.

## Tests

A deferred is nicer than a boolean flag plus `setTimeout` poll. Resolve when the fake server fires. Still prefer fake timers over real clocks.

Read MDN's examples, then delete your project's `createDeferred()` utility if it is identical. The language grew the helper because the pattern was universal, not because it is a new concurrency model. It is `new Promise` with the executor inverted. Use it for inversion of control, not as a substitute for `async/await` linear flows.
