---
title: "Error Boundaries and Resilient UI Architecture in React"
slug: "react-error-boundaries-resilient-ui"
description: "How to place error boundaries strategically in a React tree so a single failing widget degrades gracefully instead of blanking the entire page."
publishedAt: "2026-04-21"
updatedAt: "2026-09-16"
category: "React"
tags:
  - React
  - Error Handling
  - Architecture
  - Frontend Engineering
---

An uncaught render error anywhere in a React tree unmounts the whole tree by default — a broken avatar component can take down an entire dashboard, not just the corner it lives in. Error boundaries exist to contain that blast radius, but most codebases either skip them entirely or wrap the whole app in exactly one, which barely improves on the default behavior. The value comes from where you place them, not just whether they exist.

## The boundary itself

Error boundaries are still class components — there's no hook equivalent, since `getDerivedStateFromError` and `componentDidCatch` rely on lifecycle semantics hooks don't expose. Most teams write one reusable version:

```jsx
class ErrorBoundary extends React.Component {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    logErrorToService(error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback ?? <p>Something went wrong.</p>;
    }
    return this.props.children;
  }
}
```

`componentDidCatch` is where reporting belongs — it receives the component stack alongside the error, which is often more useful for tracking down *which instance* failed than the JS stack trace alone.

## Placement: contain the blast radius, not the app

Wrapping `<App>` in a single boundary means any failure anywhere replaces the entire UI with a fallback — technically resilient, practically useless. Placing boundaries around independent, self-contained sections keeps the rest of the page usable when one part fails:

```jsx
function Dashboard() {
  return (
    <div className="dashboard-grid">
      <ErrorBoundary fallback={<WidgetError name="Revenue" />}>
        <RevenueWidget />
      </ErrorBoundary>
      <ErrorBoundary fallback={<WidgetError name="Activity Feed" />}>
        <ActivityFeed />
      </ErrorBoundary>
      <ErrorBoundary fallback={<WidgetError name="Team Status" />}>
        <TeamStatus />
      </ErrorBoundary>
    </div>
  );
}
```

If `ActivityFeed` throws on a malformed API response, the other two widgets keep rendering and stay interactive. That's the actual point of error boundaries — degrade one section, not the page.

## What boundaries don't catch

Error boundaries only catch errors during rendering, in lifecycle methods, and in constructors of the tree below them. They do not catch errors in event handlers, async code, or server-side rendering. A `try/catch` inside an `onClick` handler, or a `.catch()` on a fetch promise, is still your responsibility:

```jsx
async function handleSubmit() {
  try {
    await submitForm(data);
  } catch (e) {
    setSubmitError(e.message); // boundary never sees this
  }
}
```

## Recovering, not just displaying a fallback

A static fallback is a dead end unless the user can get back to a working state. Pass a reset function and re-mount the failed subtree on retry, keyed so React actually discards the broken instance instead of reusing it:

```jsx
function WidgetError({ name, onRetry }) {
  return (
    <div className="widget-error">
      <p>{name} failed to load.</p>
      <button onClick={onRetry}>Retry</button>
    </div>
  );
}
```

Bump a `key` on the boundary's child when retrying — changing the key forces React to unmount and remount, clearing whatever internal state caused the crash in the first place, rather than re-rendering the same broken instance and hitting the identical error again.

## A worked example

A dashboard wraps the chart widget in `<ErrorBoundary fallback={<ChartDown />}>`. A thrown error in the chart does not blank the filters. The boundary logs to your error service in `componentDidCatch` / equivalent. A retry button remounts via `key={retryCount}`. Event handler errors still need `window.onerror` or try/catch — boundaries miss those.

Route-level boundary for chunk load failures with a refresh CTA.

## Failure modes

One boundary at the root: one bug whitescreens everything. Boundaries that swallow errors without logging. Expecting them to catch async `fetch` in an effect without rethrow. SSR mismatch vs client error. Fallback that throws too.

Using an error boundary as control flow for expected 404s.

## When this is the wrong tool

Error boundaries do not catch errors in event handlers, server actions unless rethrown into render, or the boundary's own fallback. They are the wrong tool for form validation. `try/catch` around await in an effect is still required. If you need isolation between micro-frontends, you need more than a React boundary (runtime and CSS). Do not use a boundary to hide a broken deploy — page and rollback.
