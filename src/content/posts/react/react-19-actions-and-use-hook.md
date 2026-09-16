---
title: "React 19 Actions and the use() Hook Explained"
slug: "react-19-actions-and-use-hook"
description: "How React 19's actions and the use() hook simplify pending state, error handling, and reading promises or context inside components."
publishedAt: "2026-04-08"
updatedAt: "2026-09-16"
category: "React"
tags:
  - React
  - React 19
  - Async
  - Frontend Engineering
---

Before React 19, wiring up a form submission meant manually tracking `isPending`, catching errors, and remembering to reset all of it on success — three or four `useState` calls for what is conceptually one operation. Actions and `use()` are React's answer: they push the async lifecycle into the framework itself, so components describe what should happen rather than manage the bookkeeping around it.

## Actions: pending state without useState

A function passed to `<form action={...}>`, or invoked through `useTransition`, is treated as an action — React automatically tracks its pending state and marks the resulting UI update as non-urgent.

```jsx
function ProfileForm({ userId }) {
  const [error, submitAction, isPending] = useActionState(
    async (previousState, formData) => {
      try {
        await updateProfile(userId, formData.get('name'));
        return null;
      } catch (e) {
        return e.message;
      }
    },
    null,
  );

  return (
    <form action={submitAction}>
      <input name="name" />
      <button disabled={isPending}>{isPending ? 'Saving...' : 'Save'}</button>
      {error && <p role="alert">{error}</p>}
    </form>
  );
}
```

`useActionState` returns the latest state, a wrapped action to pass to the form, and a pending flag — all derived from one function instead of separate `useState` calls that could drift out of sync. React also automatically resets uncontrolled form fields after a successful action, which used to require a manual ref reset.

## use(): reading promises and context conditionally

`use()` lets a component read a promise or a context value directly during render, and — unlike hooks — it can be called conditionally or inside loops, because it isn't bound by the Rules of Hooks the same way.

```jsx
function Comments({ commentsPromise }) {
  // Suspends until the promise resolves; a parent <Suspense> shows the fallback
  const comments = use(commentsPromise);
  return comments.map(c => <p key={c.id}>{c.text}</p>);
}

function Page({ commentsPromise, showComments }) {
  return (
    <Suspense fallback={<Spinner />}>
      {showComments && <Comments commentsPromise={commentsPromise} />}
    </Suspense>
  );
}
```

The conditional call there — `use()` only running when `showComments` is true — is not legal with `useState` or `useEffect`. That flexibility is deliberate: `use()` is meant to be called from render logic that already branches, not hoisted above every conditional the way hooks require.

## Reading context without the top-of-component restriction

The same relaxation applies to context. You can call `use(ThemeContext)` after an early return, inside a loop building a list of components, or nested in a helper closure — none of which work with `useContext`.

```jsx
function Panel({ items, collapsed }) {
  if (collapsed) return null; // early return is fine before use()
  const theme = use(ThemeContext);
  return <div className={theme.panelClass}>{items.length} items</div>;
}
```

## Where the two meet

Actions and `use()` compose naturally: an action can kick off a mutation, and a sibling component reading the resulting data via `use()` suspends automatically while it's in flight, with no manual loading state threaded between them. The net effect is fewer state variables dedicated purely to tracking "is this async thing done yet," and more components that just describe the data and let Suspense boundaries and action pending flags handle the rest. It's a meaningful shift away from imperative async bookkeeping and toward declarative data dependencies — closer to how server-rendered frameworks have always modeled data, but now native to client components too.

## A worked example

A form `action={save}` where `save` is async. `useFormStatus` disables the button while pending. `use(commentsPromise)` in a child reads a promise passed from a Server Component. An error in `use` is caught by the nearest boundary. You pass the promise from the server layout, not create it during client render without caching.

A client button `startTransition(() => useOptimistic)` pairs with an action for likes.

## Failure modes

Calling `use(promise)` conditionally. Creating a new promise every render so `use` suspends forever. Actions that are not idempotent on double submit. Mixing `action` and `onSubmit` preventDefault incorrectly, breaking progressive enhancement. `use` of a rejected promise without a boundary.

Passing uncached fetch promises from a client component.

## When this is the wrong tool

`use` is not a replacement for TanStack Query on a highly interactive client-only SPA. Do not use Actions for a search-as-you-type GET. Class components cannot `use`. If you must support browsers without the form action behavior you need, keep a client fetch path. `use` for non-promise thenables that never settle will hang the tree.

## A worked failure mode

`use()` is called conditionally after a hook, violating rules; another `use(promise)` in render without a cache creates a waterfalls of new promises each time. An Action succeeds on the client optimistic path and fails on the server; the form does not recover. The failure is new APIs without cache and error UI. Deduplicate promises, keep hooks unconditional, and reconcile Actions with errors.

Actions/`use` are the wrong tool for a local toggle. Do not `use()` a new Promise each render. Prefer them for framework-integrated data and forms you will test.

When this pattern is stretched past its assumptions, the first outage looks like a mysterious performance cliff instead of a design limit. "React 19 Actions and the use() Hook Explained" fails that way when traffic mix, data shape, or team skill does not match the blog that sold the approach. Keep a kill switch: feature flag, smaller blast radius, or an older path that still works. Measure the thing the idea claims to improve, not a vanity graph. If you cannot name a workload where you would refuse to use it, you have not finished the design.
