---
title: "Concurrent Rendering and Transitions: What startTransition Actually Buys You"
slug: "react-concurrent-rendering-and-transitions"
description: "Concurrent rendering lets React interrupt its own work for something more urgent. Transitions are how you tell React which updates can wait."
publishedAt: "2026-04-02"
category: "React"
tags:
  - React
  - Concurrent Rendering
  - Performance
  - Frontend Engineering
---

Before concurrent rendering, React's render process was atomic and uninterruptible: once it started rendering an update, it ran to completion, blocking the main thread the entire time. A large update — filtering a list of ten thousand rows, say — would freeze typing in a search box for the duration, because React couldn't pause the expensive render to handle the more urgent keystroke. Concurrent rendering changes that: React can now start rendering, pause partway through, handle something more urgent, and either resume or discard the paused work.

## Urgent vs Non-Urgent Is a Distinction You Make

React can't infer priority on its own — it needs you to mark which updates are allowed to be interrupted. That's what `startTransition` does:

```jsx
import { useState, startTransition } from 'react';

function SearchPage() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);

  function handleChange(e) {
    const value = e.target.value;
    setQuery(value); // urgent: the input must feel instant

    startTransition(() => {
      setResults(filterLargeDataset(value)); // non-urgent: can be interrupted
    });
  }

  return (
    <>
      <input value={query} onChange={handleChange} />
      <ResultsList results={results} />
    </>
  );
}
```

`setQuery` updates outside the transition and renders with normal, high priority — the input reflects every keystroke immediately. `setResults` is wrapped in `startTransition`, telling React this update can be paused, superseded by a newer transition, or delayed if something urgent comes in during rendering. Type quickly and React will happily throw away a stale, half-finished `results` render in favor of the newest one, rather than working through a queue of outdated renders.

## isPending Gives You a Built-In Loading Signal

`useTransition` pairs the trigger with a pending flag, so you can show that a non-urgent update is still in flight without any manual state:

```jsx
function SearchPage() {
  const [isPending, startTransition] = useTransition();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);

  function handleChange(e) {
    setQuery(e.target.value);
    startTransition(() => {
      setResults(filterLargeDataset(e.target.value));
    });
  }

  return (
    <>
      <input value={query} onChange={handleChange} />
      <div style={{ opacity: isPending ? 0.6 : 1 }}>
        <ResultsList results={results} />
      </div>
    </>
  );
}
```

That dimmed-opacity pattern is deliberately subtle rather than a spinner — the point of a transition is that the *old* content stays visible and interactive while the new content renders in the background, not that it gets replaced by a loading state the way a `Suspense` fallback would.

## useDeferredValue: The Same Idea, Applied to a Value

`useTransition` wraps the update that produces a value; `useDeferredValue` wraps the value itself, useful when you don't control where the state update originates (a value coming from props or a store):

```jsx
function ResultsList({ query }) {
  const deferredQuery = useDeferredValue(query);
  const results = useMemo(() => filterLargeDataset(deferredQuery), [deferredQuery]);
  return <ul>{results.map(r => <li key={r.id}>{r.name}</li>)}</ul>;
}
```

`deferredQuery` lags behind `query` under load and catches up once React has spare rendering capacity — functionally similar to debouncing, but scheduled by React's own priority system rather than a fixed timer, so it adapts to actual device performance instead of a guessed delay.

## What Transitions Don't Do

Transitions don't make the underlying computation faster — `filterLargeDataset` still takes exactly as long to run. What changes is whether that computation can block more urgent work while it runs. If a render is expensive enough to matter, the actual fix is still reducing the work (virtualizing a long list, moving computation off the main thread, memoizing) — transitions just stop that work from starving the interactions users notice most, like typing and clicking. Reach for `startTransition` when you've identified a specific state update that's expensive and non-urgent, not as a blanket wrapper around `setState` calls.
