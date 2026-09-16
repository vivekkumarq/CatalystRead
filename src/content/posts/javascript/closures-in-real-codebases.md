---
title: "Closures in Real Codebases, Not Just Interview Questions"
slug: "closures-in-real-codebases"
description: "Where closures actually show up in production JavaScript — memoization, private state, React hooks, and the memory leaks they quietly cause."
publishedAt: "2025-06-29"
updatedAt: "2026-09-16"
category: "JavaScript"
tags:
  - Closures
  - JavaScript
  - React
  - Memory Management
  - Frontend Engineering
---

Every JavaScript tutorial teaches closures with a counter function that increments on each call. It's a fine demonstration of the mechanism, but it doesn't explain why closures matter day to day. In real codebases, closures are the thing that makes memoization work, the thing that gave us private state before `#private` fields existed, and — less happily — the thing behind a whole category of stale-data bugs in React.

## Memoization is just a closure over a cache

The simplest useful closure pattern is a function that remembers results between calls by capturing a cache variable in its enclosing scope:

```javascript
function memoize(fn) {
  const cache = new Map();
  return function (...args) {
    const key = JSON.stringify(args);
    if (cache.has(key)) return cache.get(key);
    const result = fn(...args);
    cache.set(key, result);
    return result;
  };
}

const expensiveLookup = memoize((id) => db.querySync(id));
```

The returned function keeps a live reference to `cache` even after `memoize` has returned and its stack frame is gone. That's the entire mechanism — no special syntax, just a function that outlives the scope it was created in while still holding a reference to that scope's variables.

## Private state before `#private` fields

Before class fields got real privacy syntax, the module pattern used closures to fake it, and you'll still find this all over older codebases and some libraries that target older runtimes:

```javascript
function createCounter(start = 0) {
  let count = start;

  return {
    increment: () => ++count,
    decrement: () => --count,
    value: () => count,
  };
}

const counter = createCounter();
counter.increment();
counter.increment();
console.log(counter.value()); // 2, and count is unreachable from outside
```

Nothing external can touch `count` directly — there's no property to read off the returned object. This is functionally equivalent to a `#count` private field, and it predates that syntax by well over a decade.

## Event handler factories

Closures are also how you parameterize handlers without extra state management:

```javascript
function createRemoveHandler(itemId, onRemove) {
  return function handleClick() {
    onRemove(itemId);
  };
}

items.forEach((item) => {
  const button = document.getElementById(`remove-${item.id}`);
  button.addEventListener('click', createRemoveHandler(item.id, removeItem));
});
```

Each handler closes over its own `itemId`, so you don't need a shared mutable variable or a data attribute lookup at click time.

## The stale closure problem in React

This is where closures stop being purely convenient. A function component re-renders by calling itself again, and each render creates a fresh closure over that render's props and state. A callback created in one render — say, inside a `useEffect` with an empty dependency array — keeps referencing the variables from the render it was created in, not the current ones.

```javascript
function Timer({ onTick }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      // This closure captured `count` from the render where the effect
      // ran. It will forever log the same value, not the latest one.
      console.log(count);
      setCount(count + 1);
    }, 1000);
    return () => clearInterval(id);
  }, []); // empty deps: the effect and its closure never get recreated
}
```

The fix is either an updater function (`setCount((c) => c + 1)`, which doesn't need to close over `count` at all) or including `count` in the dependency array so the effect re-subscribes with a fresh closure each render. Understanding that this is a closure problem, not a "React bug," is what makes the dependency array make sense instead of feeling like arbitrary linting.

## The memory cost

Closures keep their entire enclosing scope alive, not just the variables they reference — if a closure captures one variable from a scope that also holds a large array, that array can't be garbage collected until the closure itself is unreachable. This matters most for long-lived closures: event listeners never removed, timers never cleared, or callbacks stored in module-level caches. It's rarely worth avoiding closures over it, but it's worth knowing when auditing a memory leak that everything a closure could reach counts as reachable.

## A worked failure mode

A loop of async handlers closes over `var i` (or a reused `let` in a poorly transpiled bundle) and every handler sees the last index. A React effect closes over stale props because the dependency array omitted them; the closure is "correct JS" and wrong product. A cache of callbacks retains the entire request object via a closure and leaks memory. The failure is lifetime: what the function sees vs what you think it saw. Capture values you need, bind explicitly, and do not retain large objects in long-lived callbacks.

## When this is the wrong tool

Clever closures are the wrong tool when a named function with parameters would be clearer. Do not hide globals in closures to avoid passing deps. Use closures for small adapters; pass explicit context for long-lived workers.

Treat the counterexample as part of the spec. Someone will apply "Closures in Real Codebases, Not Just Interview Questions" to a problem that only looks similar at the noun level—same words, different constraints. Require a one-page fit check: scale, consistency, failure domains, and who is on call. If two of those are guesses, run a spike, not a rewrite. The expensive bugs are not the ones in the happy-path tutorial; they are the ones where the tutorial's silent assumptions were load-bearing.
