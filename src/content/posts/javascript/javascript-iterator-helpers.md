---
title: "JavaScript Iterator Helpers: map/filter/take on Iterators Without Arrays"
slug: "javascript-iterator-helpers"
description: "ECMAScript iterator helpers: lazy map and filter on iterators, why they are not Array extras, and the prototype they live on."
publishedAt: "2026-09-10"
category: "JavaScript"
tags:
  - JavaScript
  - Iterators
  - ECMAScript
  - Language
sources:
  - title: "Iterator Helpers proposal"
    publisher: "TC39"
    url: "https://github.com/tc39/proposal-iterator-helpers"
  - title: "Iterator.prototype"
    publisher: "MDN"
    url: "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Iterator"
---

Arrays have `.map` that allocates. **Iterators** (the objects behind `for…of`) were pull-based and clumsy to compose. **Iterator helpers** (TC39, shipping in modern engines) add `.map`, `.filter`, `.take`, `.drop`, `.flatMap`, `.reduce`, `.toArray`, `.forEach`, `.some`, `.every`, `.find` on **`Iterator.prototype`**. They are **lazy**: `iter.map(f).take(3)` only pulls three values. You do not pay for the rest of an infinite generator.

## Not a replacement for Array.prototype

```js
function* nums() { for (let i = 0; ; i++) yield i; }
const firstEvens = nums().filter(n => n % 2 === 0).take(5).toArray();
```

`nums()` is infinite; `.toArray()` without `.take` is a hang. Helpers return **iterator wrappers**, not arrays, until you terminate. Spreading `[...helper]` is also eager.

`Iterator.from(array)` or `array.values()` gets you an iterator from an array when you want laziness. Don't convert huge arrays to iterators just to `.map` if you needed a new array anyway — `Array.prototype.map` is fine.

There's an existing article on iterators and generators. This one is specifically the **helpers** API.

## Prototype and libraries

Methods live on `Iterator.prototype`. Ordinary objects that are iterable via `Symbol.iterator` but are not iterators don't have `.take` unless you `Iterator.from`. User iterators that inherit correctly get helpers for free.

Generators return generator objects, which are iterators; helpers should work. Closing: breaking a `for` of a mapped iterator should propagate `return()` for cleanup. If you wrap iterators by hand, implement `return`.

## Support

Check baseline: older browsers need a polyfill (`core-js` or a ponyfill). TypeScript types landed as the lib DOM/ES versions caught up; you may need a newer `lib`.

Read the proposal's examples and MDN's `Iterator` page. Then replace a `for` loop that pushed into an array only to `.slice(0, 5)` with `.take(5).toArray()`. Laziness is the feature. The method names are bait to use them like lodash on infinite streams — remember to terminate.
