---
title: "AbortController: Cancellation That the Rest of the Stack Can See"
slug: "abortcontroller-cancellation-patterns"
description: "How to cancel fetches, timeouts, and composed async work with AbortSignal, without leaking listeners or racing the next request."
publishedAt: "2026-08-08"
category: "JavaScript"
tags:
  - JavaScript
  - Async/Await
  - Fetch
  - Frontend Engineering
---

`fetch` without cancellation is a leak: the user navigated away, React already unmounted the component, and a response still parses JSON and calls `setState`. `AbortController` is the platform's answer — a signal object you pass down so every layer can stop. The API is small. The bugs are all in how you share one controller across overlapping requests.

## One controller per in-flight operation

Create a controller when the operation starts, pass `signal` into `fetch` and into any timeout you own, abort on the event that should win (new keystroke, unmount, route change). Do not reuse a controller that has already aborted; once aborted, it stays aborted.

```javascript
let inflight = null;

export function search(query) {
  inflight?.abort();
  const controller = new AbortController();
  inflight = controller;

  return fetch(`/api/search?q=${encodeURIComponent(query)}`, {
    signal: controller.signal,
  })
    .then((res) => {
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    })
    .finally(() => {
      if (inflight === controller) inflight = null;
    });
}
```

Swallowing `AbortError` is usually correct at the UI boundary. Logging it as a failed search trains on-call to ignore real outages.

## Timeouts are abort, not a second clock

`AbortSignal.timeout(ms)` (where available) or a `setTimeout` that calls `abort()` gives the server a chance to stop too, if you also send the connection reset. A `Promise.race` against a timer that ignores the fetch leaves the request running. Prefer aborting the same signal the fetch already holds.

```javascript
const controller = new AbortController();
const t = setTimeout(() => controller.abort(), 8_000);
try {
  const res = await fetch(url, { signal: controller.signal });
  return await res.json();
} finally {
  clearTimeout(t);
}
```

## Composing signals

A modal might cancel because the user closed it *or* because a parent layout aborted. `AbortSignal.any` (newer runtimes) or a tiny helper that aborts a child when either parent fires keeps the rule: cancellation flows down, never up from a grandchild that should not kill the whole page.

Event listeners registered against `signal` should use `{ signal }` in `addEventListener` so abort also drops the listener. Otherwise you leak handlers on a DOM node that outlives the request.

The mental model is structured concurrency lite: every async tree has a deadline or a cancel token, and leaving the tree always aborts the children. Once that is true, "stale response wrote to the wrong row" becomes a class of bug you mostly stop writing.
