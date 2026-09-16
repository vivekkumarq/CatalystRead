---
title: "useEffect Pitfalls and What to Reach for Instead"
slug: "react-useeffect-pitfalls-and-alternatives"
description: "Most useEffect bugs come from using it as a general-purpose lifecycle hook. Here's how to tell when you actually need it — and when you don't."
publishedAt: "2026-01-22"
updatedAt: "2026-09-16"
category: "React"
tags:
  - React
  - Hooks
  - JavaScript
  - Frontend Engineering
---

`useEffect` is the hook that gets reached for by default and misused most often, largely because early React tutorials framed it as "the place code that isn't rendering goes." That framing is too broad. `useEffect` has one specific job: synchronizing your component with a system outside React — the DOM, a subscription, a network connection, browser storage. Most of the pitfalls come from using it for things that aren't synchronization at all.

## Pitfall 1: Deriving State You Already Have

```jsx
// Wrong: an extra render, an extra state variable, a sync bug waiting to happen
function ProductList({ products, filter }) {
  const [filtered, setFiltered] = useState([]);
  useEffect(() => {
    setFiltered(products.filter(p => p.category === filter));
  }, [products, filter]);
  return <ul>{filtered.map(p => <li key={p.id}>{p.name}</li>)}</ul>;
}
```

```jsx
// Right: no effect, no extra state, no lag between props and derived value
function ProductList({ products, filter }) {
  const filtered = products.filter(p => p.category === filter);
  return <ul>{filtered.map(p => <li key={p.id}>{p.name}</li>)}</ul>;
}
```

The first version renders with stale `filtered` on every prop change, then re-renders a moment later with correct data — a visible flash on anything but trivial computations, and a class of bug where `filtered` and `products`/`filter` drift out of sync if some code path updates one but not the other. If the computation is genuinely expensive, wrap the *value*, not an effect, in `useMemo`.

## Pitfall 2: Resetting State on Prop Change

```jsx
// Wrong: effect fires after the old UI already rendered once
function Comments({ postId }) {
  const [comments, setComments] = useState([]);
  useEffect(() => {
    setComments([]); // reset
    fetchComments(postId).then(setComments);
  }, [postId]);
}
```

```jsx
// Right: key forces a full remount, resetting state as a side effect of identity
<Comments postId={postId} key={postId} />
```

Changing the `key` tells React this is conceptually a different component instance, so all state resets automatically — no stale-comments flash, no manual reset call to remember.

## Pitfall 3: The Missing Cleanup, and the Race It Creates

```jsx
// Wrong: a fast postId change can let an old response overwrite a newer one
useEffect(() => {
  fetchComments(postId).then(setComments);
}, [postId]);
```

```jsx
// Right: ignore stale responses
useEffect(() => {
  let ignore = false;
  fetchComments(postId).then(data => {
    if (!ignore) setComments(data);
  });
  return () => { ignore = true; };
}, [postId]);
```

This race is easy to miss in development, where network latency is near zero, and common in production, where two fetches issued in quick succession can resolve out of order.

## Pitfall 4: Calling a Function "Because the Value Changed"

```jsx
// Wrong: reaching for an effect to respond to a state change
useEffect(() => {
  if (isSubmitted) {
    showToast('Order placed!');
  }
}, [isSubmitted]);
```

```jsx
// Right: call it where the state change originates
function handleSubmit() {
  setIsSubmitted(true);
  showToast('Order placed!');
}
```

If you know exactly which event caused a state change, respond to that event directly. Reserve effects for cases where you're reacting to a render, not an action — like syncing a signal from an external source into React state.

## When useEffect Is Genuinely the Right Tool

Subscribing to an external store, setting up a WebSocket connection, manually mutating a non-React DOM node (a `<canvas>`, a third-party map widget), or synchronizing `document.title` with component state — these are cases where React's render output alone can't express the side effect, because it's happening outside React's model entirely:

```typescript
useEffect(() => {
  const socket = new WebSocket(url);
  socket.onmessage = (event) => setMessages(prev => [...prev, event.data]);
  return () => socket.close();
}, [url]);
```

The test worth applying before writing any effect: "is this synchronizing with something outside React, or am I just responding to a render?" The first case is what `useEffect` is for. The second almost always has a more direct, effect-free answer.

## A worked failure mode

An effect fetches on `[user]` but also writes to state that changes `user`, looping. Another syncs props to state and fights the parent. A subscription is missing cleanup. The failure is effects as lifecycle catch-alls. Fetch with a query library or an event; derive instead of syncing; clean up.

## When this is the wrong tool

`useEffect` is the wrong tool to compute a filtered list—use render. It is the wrong place for business logic that should be an event handler. Use effects for external systems, not for thinking.

The wrong-tool test is easier with a concrete customer. If a user can lose money, lose access, or see someone else's data when "useEffect Pitfalls and What to Reach for Instead" is slightly misapplied, do not let the pattern ride on defaults. Tighten the API, add an assertion in CI, and refuse silent fallbacks that look like success. Most production failures here are not exotic; they are a missing bound, a missing key, or a missing check that the original paper assumed a careful operator would have.
