---
title: "Proxy and Reflect: Practical Metaprogramming in JavaScript"
slug: "proxy-and-reflect-use-cases"
description: "Real-world Proxy traps for validation, reactivity, and guardrails, plus why Reflect exists and when skipping it silently breaks your object."
publishedAt: "2025-09-21"
category: "JavaScript"
tags:
  - Proxy
  - Metaprogramming
  - JavaScript
  - Reactivity
  - Frontend Engineering
---

`Proxy` has a reputation as an exotic, rarely-needed feature, but it's the mechanism behind Vue 3's entire reactivity system and shows up regularly in validation layers, ORMs, and API client libraries. If you've wondered how Vue tracks which component re-renders when you mutate a plain object with `state.count++`, the answer is a `Proxy` with a `set` trap, not magic.

## What a Proxy actually does

A `Proxy` wraps a target object and lets you intercept fundamental operations — property reads, writes, deletion, `in` checks — through a handler object of trap functions. Every operation you don't trap falls through to the target unchanged.

```javascript
const user = { name: 'Priya', age: 29 };

const guarded = new Proxy(user, {
  set(target, prop, value) {
    if (prop === 'age' && typeof value !== 'number') {
      throw new TypeError('age must be a number');
    }
    target[prop] = value;
    return true;
  },
});

guarded.age = 30;      // fine
guarded.age = 'old';   // throws TypeError
```

This is the cleanest way to enforce invariants on a plain object without wrapping every field access in getter/setter boilerplate — one trap covers every property, current and future.

## Reactivity: how Vue-style tracking actually works

The reactive-state pattern you'll find in Vue 3, and in spirit in libraries like MobX and Valtio, is a `get` trap that records "this property was read during this render" and a `set` trap that triggers a re-render for anyone who read it:

```javascript
function reactive(target, onChange) {
  return new Proxy(target, {
    get(obj, prop, receiver) {
      track(obj, prop); // record dependency
      return Reflect.get(obj, prop, receiver);
    },
    set(obj, prop, value, receiver) {
      const result = Reflect.set(obj, prop, value, receiver);
      onChange(prop, value); // notify subscribers
      return result;
    },
  });
}
```

The state object looks and behaves exactly like a plain object to the rest of the code — `state.count++` just works — but every read and write is silently instrumented. That's the appeal over the old `Object.defineProperty`-based approach Vue 2 used: no need to know property names ahead of time, and array index/length mutations are trapped correctly too.

## Why Reflect, specifically

Every trap above calls the matching `Reflect` method instead of operating on `target` directly. It's tempting to skip this — `target[prop] = value` looks equivalent to `Reflect.set(obj, prop, value, receiver)` — but it isn't, once inheritance is involved. The `receiver` argument preserves the correct `this` binding for the original call site, which matters when the proxy is used as another object's prototype.

```javascript
const base = new Proxy(
  {},
  {
    get(target, prop, receiver) {
      // Wrong: uses `target` as `this`, breaking getters defined
      // on objects that inherit from this proxy.
      // return target[prop];

      // Right: forwards the original receiver.
      return Reflect.get(target, prop, receiver);
    },
  }
);
```

Without `Reflect`, a getter defined further up a prototype chain that references `this` will resolve `this` to the wrong object, producing bugs that only appear once someone extends or inherits from your proxied object — which is exactly the kind of bug that survives code review and shows up three months later.

## Other traps worth knowing

`has` lets you intercept the `in` operator, useful for hiding internal fields from feature detection. `deleteProperty` lets you block or log deletions. `apply` and `construct` let you proxy functions and classes themselves, which is how some mocking libraries intercept calls without modifying the original function. A default-value object is a one-liner with a `get` trap:

```javascript
const withDefault = (obj, fallback) =>
  new Proxy(obj, { get: (t, p) => (p in t ? t[p] : fallback) });
```

The common thread across all of these: `Proxy` earns its complexity when you need a rule to apply uniformly across every property of an object, not per-property. If you only need special behavior on one or two known fields, a regular getter/setter is simpler and faster — save `Proxy` for when the property set is dynamic or unknown ahead of time.
