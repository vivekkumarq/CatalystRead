---
title: "Iterators and Generators: The Machinery Behind for...of"
slug: "javascript-iterators-and-generators"
description: "How the iterator protocol and generator functions work under the hood, and where they solve real problems like pagination and lazy sequences."
publishedAt: "2025-08-24"
category: "JavaScript"
tags:
  - Generators
  - Iterators
  - JavaScript
  - Async/Await
  - Data Structures
---

`for...of`, spread syntax, destructuring arrays, and `Array.from` all lean on the same underlying contract: the iterator protocol. Most engineers use it constantly without ever implementing it, which is fine until you need a custom object to behave like a native collection — at which point knowing the protocol is the difference between a clean five-line solution and fighting the language.

## The protocol itself

An object is iterable if it has a method at `Symbol.iterator` that returns an iterator — an object with a `next()` method returning `{ value, done }`. That's the entire contract, nothing more.

```javascript
const range = {
  from: 1,
  to: 5,
  [Symbol.iterator]() {
    let current = this.from;
    const last = this.to;
    return {
      next() {
        return current <= last
          ? { value: current++, done: false }
          : { value: undefined, done: true };
      },
    };
  },
};

console.log([...range]); // [1, 2, 3, 4, 5]
for (const n of range) console.log(n);
```

Once an object implements this, it works with every language construct that consumes iterables — `for...of`, spread, `Array.from`, destructuring — without any of them knowing anything about `range` specifically. That's the whole point of a protocol over inheritance: consumers only need to agree on the shape.

## Generators: the same protocol, written imperatively

Writing the object above by hand means manually tracking state between calls, which gets unpleasant fast for anything more complex than a numeric range. Generator functions do that state tracking for you — each `yield` pauses execution and hands a value out, resuming exactly where it left off on the next `next()` call.

```javascript
function* range(from, to) {
  for (let i = from; i <= to; i++) {
    yield i;
  }
}

for (const n of range(1, 5)) console.log(n);
```

A generator function is itself a `Symbol.iterator`-compatible factory — calling it returns an iterator, so any object can become iterable just by defining `[Symbol.iterator] = function* () { ... }` instead of hand-writing a `next()` method.

## Lazy sequences and infinite generators

Because a generator only computes the next value when asked, it can represent sequences that would be impossible to build eagerly:

```javascript
function* naturalNumbers() {
  let n = 1;
  while (true) yield n++;
}

function* take(iterable, count) {
  let i = 0;
  for (const value of iterable) {
    if (i++ >= count) return;
    yield value;
  }
}

console.log([...take(naturalNumbers(), 5)]); // [1, 2, 3, 4, 5]
```

`naturalNumbers()` never terminates on its own, but nothing is wasted computing values nobody asked for — `take` pulls exactly five and stops. This composability is the practical payoff: you can build pipelines of lazy transformations the same way you'd chain array methods, but without materializing intermediate arrays.

## Where this earns its keep in production code

The most common real use I've shipped is paginated API consumption, where a generator hides the pagination entirely from the caller:

```javascript
async function* fetchAllPages(url) {
  let nextUrl = url;
  while (nextUrl) {
    const res = await fetch(nextUrl);
    const page = await res.json();
    yield* page.items;
    nextUrl = page.nextUrl;
  }
}

for await (const item of fetchAllPages('/api/orders')) {
  process(item);
}
```

`async function*` combines the generator protocol with promises — `for await...of` pulls one item at a time, fetching the next page only when the consumer asks for more. The caller never sees `nextUrl`, cursors, or page boundaries; they just iterate items. This is also how Node's streams and many database driver cursors are implemented internally, so understanding generators makes those APIs far less mysterious. Before `async/await` existed, this same pause-and-resume mechanism (`yield` combined with a driver function that fed results back via `.next(value)`) was how libraries like co simulated async functions — worth knowing if you ever run into that pattern in an older codebase.
