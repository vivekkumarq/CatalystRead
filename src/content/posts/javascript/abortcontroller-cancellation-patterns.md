---
title: "AbortController: Cancellation That the Rest of the Stack Can See"
slug: "abortcontroller-cancellation-patterns"
description: "How to cancel fetches, timeouts, and composed async work with AbortSignal, without leaking listeners or racing the next request."
publishedAt: "2026-08-08"
updatedAt: "2026-09-16"
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

## A worked example

Typeahead: each keystroke aborts the previous `fetch`. The React effect returns `() => controller.abort()`. The search function treats `error.name === "AbortError"` as a no-op. A second example: a page-level `AbortController` passed into three widgets so route change cancels uploads, maps, and polls together. Child widgets create their own controllers linked with `AbortSignal.any([parent.signal, local.signal])` where supported.

```javascript
useEffect(() => {
  const c = new AbortController();
  load(id, c.signal);
  return () => c.abort();
}, [id]);
```

## Failure modes

Reusing one controller for sequential unrelated requests: the second starts already aborted. Forgetting `{ signal }` on `addEventListener` leaks. Catching `error` broadly and showing a toast on abort looks like a failure to the user. Node `fetch` abort may not stop server-side work if the HTTP client is not the one that received the signal. Racing `abort()` and `then()` can still parse a body that already arrived — guard `setState` with a cancelled flag or ignore abort after unmount.

`AbortSignal.timeout` plus a second manual timeout double-aborts and confuses logs.

## When this is the wrong tool

Cancellation will not make a 30s query fast; fix the query. Do not abort a payment POST unless the API is idempotent and you know the server stopped. `AbortController` is the wrong tool for coordinating React Query/SWR caches — use those libraries' cancellation hooks. If you only have one fetch on a static page, skip the ceremony. WebSockets need `close()`, not fetch abort. For job queues, cancellation is a protocol (message + worker check), not a browser signal.

## Review checklist

- One fresh controller per in-flight operation; aborted controllers are not reused.
- Timeouts abort the same signal `fetch` holds; the timer is cleared in `finally`.
- `AbortError` is swallowed at the UI boundary, not paged as an outage.
- Listeners use `{ signal }` so abort drops them.

## A worked failure mode

A search box fires fetch per keystroke without aborting the previous; slower older responses overwrite newer UI. The abort is called, but a `then` still writes because it was not checking `signal.aborted`. A shared controller is aborted and every unrelated request on the page dies. The failure is cancel as an afterthought. One controller per in-flight user action, ignore results after abort, and do not reuse a spent controller.

AbortController is the wrong tool if the work is already local and cheap. Do not abort a payment you cannot reverse. Use it for stale reads and navigation; keep writes explicitly acknowledged.

A worked anti-pattern: the team ships the architecture, then staffs it like a toy. "AbortController: Cancellation That the Rest of the Stack Can See" needs boring operations—backups, timeouts, ownership, and a budget for the tax the idea always charges (compaction, replay, dual writes, extra latency, extra types). Unstaffed taxes come due at 2am. Put the tax in the design doc's cost section. If leadership wants the benefit without the tax, the honest answer is a smaller idea, not a heroic on-call rotation.
