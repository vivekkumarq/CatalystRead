---
title: "Object.groupBy and Map.groupBy: Grouping Without the Reduce Ritual"
slug: "javascript-array-grouping-object-groupby"
description: "ES Object.groupBy / Map.groupBy: keyed buckets, insertion order, and when a Map of arrays beats a plain object of arrays."
publishedAt: "2026-09-12"
category: "JavaScript"
tags:
  - JavaScript
  - Arrays
  - ECMAScript
  - Language
sources:
  - title: "Object.groupBy()"
    publisher: "MDN"
    url: "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/groupBy"
  - title: "Map.groupBy()"
    publisher: "MDN"
    url: "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map/groupBy"
---

Grouping an array by a key used to be `reduce` into `Record<string, T[]>` with an `||= []` push. **`Object.groupBy(iterable, fn)`** returns a null-prototype object of arrays. **`Map.groupBy(iterable, fn)`** returns a `Map` whose keys can be **any** value (objects, numbers) without string coercion.

## Object versus Map

```js
const rows = [
  { type: 'a', n: 1 },
  { type: 'b', n: 2 },
  { type: 'a', n: 3 },
];
const byType = Object.groupBy(rows, r => r.type);
// { a: […], b: […] }  (null prototype)
```

`Object.groupBy` stringifies keys (ToPropertyKey). `1` and `'1'` collide. Use `Map.groupBy` for numeric or object keys:

```js
Map.groupBy(points, p => p.bucket);
```

Null prototype means `byType.toString` is not a method from `Object.prototype` — a small security/hygiene win if you iterate keys from user data. `for…in` still needs care; prefer `Object.entries`.

## Lazy iterables

The first argument is iterable. A generator is consumed once. The callback should be pure; it is the key selector, not a mapper. To map and group, map first (iterator helper or array).

Not a sort. Groups appear in **first-seen key order** for Object (ordinary object key order rules) and insertion order for Map. Within a group, original encounter order is preserved.

## Support and lodash

Lodash `groupBy` is similar to `Object.groupBy` with prototype quirks. Native methods are smaller. Polyfill for older browsers. TypeScript: ensure lib includes the ES2024 (or whichever year your target uses) signatures.

Read both MDN pages; the Map version is the one people miss when they group by a Date or a tuple. Then delete a 12-line reduce. The ritual was never the domain logic.
