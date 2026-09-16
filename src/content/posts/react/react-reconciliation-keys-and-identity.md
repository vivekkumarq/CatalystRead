---
title: "Reconciliation, Keys, and Why Your List Animates the Wrong Row"
slug: "react-reconciliation-keys-and-identity"
description: "How React matches lists between renders, what keys actually identify, and the local-state bugs that index keys create."
publishedAt: "2026-09-06"
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
