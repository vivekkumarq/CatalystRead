---
title: "Reconciliation, Keys, and Why Your List Animates the Wrong Row"
slug: "react-reconciliation-keys-and-identity"
description: "How React matches lists between renders, what keys actually identify, and the local-state bugs that index keys create."
publishedAt: "2026-09-06"
updatedAt: "2026-09-16"
category: "React"
tags:
  - React
  - Reconciliation
  - Performance
  - Frontend Engineering
---

React does not diff your UI as a screenshot. It walks two trees of elements and decides what to mount, reuse, or unmount. For lists, **keys** are the identity React uses to match an old child with a new one. Get identity wrong and a typed input jumps to another row, a CSS transition plays on the wrong card, and `useState` inside the item follows the index instead of the record.

## Matching is not "whatever looks similar"

If you render `items.map((item, i) => <Row key={i} item={item} />)` and then sort or insert at the top, React reuses the component instance at index 0 for a different `item`. Internal state (open/closed, cursor position) stays with the instance. The new record inherits a half-finished edit.

```jsx
// identity = business id
{todos.map((t) => (
  <TodoRow key={t.id} todo={t} />
))}
```

IDs must be stable for the lifetime of that row. A `key={Math.random()}` remounts every render — animations reset, focus dies, effects re-fire. A `key={item.name}` collides when two rows share a name.

## Keys are not a performance hint first

People add keys to "help the diff." The diff already walks by position if keys are missing (and warns). Keys are a correctness feature that *also* lets React move a node instead of destroying it. If the list is static and never reorders, index keys happen to be stable — until the day they are not.

Fragments need keys too when you return an array of fragments from a map.

## When the tree is the wrong grain

If a row's state is important, lift it to the parent or a store keyed by id, so remounting the view does not drop data. If you must reset state when the id changes, `key={id}` on the *form* is the supported reset: changing the key unmounts the subtree on purpose.

React 19 did not repeal this. Compiler memoization does not invent identity. If two siblings swap keys, you still told React they swapped.

The code review question is: "If this array shuffles, does each component keep the state that belongs to its record?" If not, the key is decorative.

## A worked example

A todo list keeps a text field per row. Each `TodoRow` owns `useState` for the draft. Keys are array indexes. User filters to "active," which prepends a new item. The first row's input still shows the old draft because React reused the component at index 0. Fix: `key={todo.id}`. Add a test that types into item A, reorders the array, and expects the same text to stay with A's id.

If you need to reset a form when switching records, put `key={record.id}` on the form component. That is an intentional remount, not a list bug.

```jsx
<CustomerForm key={customer.id} customer={customer} />
```

## Failure modes

Stable-looking keys that collide (`email` as key when two guests share a blank email). Using the object reference as a key via `key={item}` coerces to `"[object Object]"` and collides everything. Animation libraries that also track identity will fight React if their `layoutId` does not match the key. Server-rendered lists with keys that differ from client hydration (random UUIDs generated twice) produce hydration mismatches and extra remounts.

Index keys on a virtualized windowed list can be correct for the *window* if you key by record id anyway; keying by window index reintroduces the shuffle bug as you scroll.

## When this is the wrong tool

Keys will not make a slow list fast; virtualization will. They will not persist state across unmounts — lift state or use a store. Do not use `key={Date.now()}` to "force refresh" on every parent render; that destroys accessibility and performance. If the list is a static footer of three links, index keys are fine. If you are resetting state, prefer an explicit `key` on a focused subtree rather than remounting the entire page.

## Review checklist

- List keys are stable business IDs, not indexes, unless the list cannot reorder.
- No `Math.random()` keys; no `key={item}` objects.
- State that must survive remount lives in a parent or store keyed by id.
- A shuffle test exists for any row with internal state.
