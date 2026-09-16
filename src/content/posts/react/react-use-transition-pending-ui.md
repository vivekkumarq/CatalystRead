---
title: "useTransition Pending UI: Showing Wait Without Blocking the Keystroke"
slug: "react-use-transition-pending-ui"
description: "isPending, startTransition, and patterns for spinners that do not steal focus or freeze the input that triggered the update."
publishedAt: "2026-08-25"
category: "React"
tags:
  - React
  - Concurrent Rendering
  - UX
  - Hooks
sources:
  - title: "useTransition"
    publisher: "React docs"
    url: "https://react.dev/reference/react/useTransition"
  - title: "startTransition"
    publisher: "React docs"
    url: "https://react.dev/reference/react/startTransition"
---

`useTransition` returns `[isPending, startTransition]`. You wrap a `setState` (or a router navigation) in `startTransition` so React treats it as **interruptible**. `isPending` is true until that transition commits. The point is **pending UI**: a dimmed list, a progress bar, a "Updating…" live region — while the text field that fired the update stays responsive on the urgent lane.

## Split urgent and non-urgent state

Keep the input's `value` on urgent state. Keep the **filtered results** on state updated inside `startTransition`. If both live in one `setQuery` that immediately filters 20k rows during render, you did not use the API. You nested the heavy work in the wrong setter.

```jsx
const [text, setText] = useState('');
const [list, setList] = useState(items);
const [isPending, startTransition] = useTransition();

function onChange(e) {
  const v = e.target.value;
  setText(v);
  startTransition(() => setList(filter(items, v)));
}
```

`isPending` should not replace the input with a spinner. It should mark the **results** (`aria-busy` on the list, opacity). A spinner on the whole page is how pending UI becomes worse than jank.

## Navigations and Suspense

React Router / Next.js navigations can be transitions. `isPending` then means the next screen's data is not committed. Pair with `Suspense` fallbacks for first load, and pending for **subsequent** navigations so you do not unmount the whole layout. `useDeferredValue` is the cousin when you already have a single urgent value and want a lagged copy for the heavy child.

Do not start a transition around a `fetch` without also handling the promise (`use` in 19, or a query library). `startTransition` is about **rendering** priority, not about network. You can set a promise into state inside a transition; the network still takes wall time.

## Failure modes

Nested transitions, `isPending` that never clears because an error boundary ate the render, and libraries that call `flushSync` and undo the point. Test with CPU throttle. If the input still drops characters, the filter still runs on the urgent path (or you blocked in an effect).

Read the `useTransition` reference's examples, then add `aria-busy` and a visually quiet pending state. Pending UI is accessibility plus scheduling. A CSS spinner on `<body>` is neither.
