---
title: "The Event Loop, Microtasks, and Macrotasks, Explained Properly"
slug: "javascript-event-loop-microtasks-macrotasks"
description: "A precise walkthrough of how the JS event loop orders microtasks and macrotasks, with the interleaving bugs that actually bite in production code."
publishedAt: "2025-06-01"
updatedAt: "2026-09-16"
category: "JavaScript"
tags:
  - Event Loop
  - JavaScript
  - Async/Await
  - Node.js
  - Performance
---

Most explanations of the event loop stop at "microtasks run before macrotasks," which is true but not useful enough to predict what your code will actually do. The interesting part is what counts as a microtask, what counts as a macrotask, and how the two queues interact across a single tick. Get that wrong and you'll misdiagnose real bugs as "flaky async" when they're completely deterministic.

## The three queues that matter

JavaScript is single-threaded, so there's one call stack. When the stack empties, the runtime pulls work from two separate queues, not one:

- **Microtask queue**: promise `.then`/`.catch`/`.finally` callbacks, `queueMicrotask()`, and `async/await` continuations (an `await` is sugar for a `.then`).
- **Macrotask queue**: `setTimeout`, `setInterval`, `setImmediate` (Node only), I/O callbacks, and UI events in the browser.

The rule that actually matters: after every single macrotask finishes, the runtime drains the *entire* microtask queue — including any new microtasks scheduled while draining — before touching the next macrotask. Microtasks don't get one pass; they get exhausted.

```javascript
console.log('start');

setTimeout(() => console.log('timeout'), 0);

Promise.resolve()
  .then(() => console.log('microtask 1'))
  .then(() => console.log('microtask 2'));

console.log('end');

// start, end, microtask 1, microtask 2, timeout
```

Two `.then` calls chained back to back still both run before the `setTimeout`, even though it was scheduled with a 0ms delay. The microtask queue doesn't yield to the macrotask queue until it's empty.

## Where this actually bites you

The failure mode I see most often is accidental starvation: a recursive or chained microtask that keeps re-scheduling itself never lets the macrotask queue run, which means rendering, timers, and I/O callbacks all stall.

```javascript
function loop() {
  Promise.resolve().then(loop);
}
loop();
// This starves setTimeout, requestAnimationFrame, and incoming
// network events indefinitely. The tab or process appears frozen
// even though the JS "thinks" it's doing nothing wrong.
```

I've seen this exact pattern show up disguised as a retry-with-backoff written using `await Promise.resolve()` instead of `await new Promise(r => setTimeout(r, delay))` — someone wanted a "yield" and grabbed the wrong primitive. A microtask yield doesn't give the browser a chance to paint or the event loop a chance to service timers; only a macrotask does.

## async/await doesn't change the ordering, it just hides it

`await` schedules the rest of the function as a microtask continuation, so an `async` function's post-await code runs at the same priority as a `.then` callback. This means interleaving async functions with plain promise chains can produce ordering that looks wrong until you trace it queue by queue:

```javascript
async function a() {
  console.log('a start');
  await null;
  console.log('a end');
}

async function b() {
  console.log('b start');
  await null;
  console.log('b end');
}

a();
b();
// a start, b start, a end, b end
```

Both functions run synchronously up to their first `await`, then queue their continuations as microtasks in the order they hit that `await` — not in the order the functions were called relative to each other's completion.

## Node vs the browser

Node's loop has more phases than the browser (timers, pending callbacks, poll, check, close callbacks), and `process.nextTick()` runs even before the microtask queue on each phase transition — it has higher priority than promises. If you're debugging ordering issues in Node and only reasoning about promises vs `setTimeout`, you're missing a queue. `setImmediate` also behaves differently from `setTimeout(fn, 0)`: inside an I/O callback, `setImmediate` is guaranteed to run before any timer, which is the opposite of what intuition suggests from the name.

If you're chasing an ordering bug, the fastest way to build the right mental model is to actually log at every boundary — call stack, microtask drain, macrotask pickup — rather than guessing from the API names.

## A worked failure mode

A `Promise.then` chain starves rendering because it never yields to macrotasks; a progress bar freezes. `setTimeout(0)` is used as a fairness hack and still batches wrong. An unhandled rejection from a microtask crashes a test runner later. The failure is assuming async means yield. Insert real yields for long work (`scheduler.yield` or chunking) and know that promises run before paint.

## When this is the wrong tool

Event-loop trivia is the wrong tool to fix a 200ms JSON parse—move it off the main thread. Do not `await` in a loop to "be nice" without measuring. Learn the loop to debug ordering, not to write puzzles.

Copy-paste from an internal success is still a failure mode. The last team had different traffic, a different datastore, and six months of scars. "The Event Loop, Microtasks, and Macrotasks, Explained Properly" should be adopted with the scars attached: the dashboard they wished they had, the migration they feared, the incident that made the rule. If those artifacts are missing, you are adopting a slide. Spend a day interviewing the last on-call before you spend a quarter implementing their diagram.
