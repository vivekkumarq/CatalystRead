---
title: "How React Decides to Re-render"
slug: "react-rendering-mental-model"
description: "Renders are not DOM updates. Understand what actually triggers a render, what reconciliation does, and when memoization earns its keep."
publishedAt: "2026-07-28"
category: "React"
tags:
  - React
  - JavaScript
  - Performance
  - Frontend Engineering
---

Half of React performance folklore comes from conflating two different things: *rendering* (calling your component function) and *committing* (touching the DOM). Once you separate them, most of the mystery dissolves.

## What Triggers a Render

A component re-renders in exactly two situations:

1. Its own state changed (`useState`, `useReducer`).
2. Its parent re-rendered.

That's the whole list. Props "changing" is not a trigger — props are just arguments the parent passes during *its* render. This is why a state change at the top of the tree cascades: every descendant renders by default, changed props or not.

```jsx
function Dashboard() {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <>
      <Clock value={now} />
      <ExpensiveReport />   {/* re-renders every second, for no visible reason */}
    </>
  );
}
```

## Reconciliation: Renders Are Cheap, Commits Are Not

When a component renders, React gets a new element tree and *diffs* it against the previous one. Only actual differences reach the DOM. So `ExpensiveReport` above re-renders every second, but if its output is identical, the DOM is untouched.

Rendering, however, is not free — it is JavaScript executing. For most components it is microseconds and irrelevant. It becomes relevant when the render itself does heavy work: large lists, expensive calculations, deep trees.

## The Three Tools, In Order

When a render cascade is genuinely expensive, reach for these in order:

**1. Move state down.** The cheapest fix is structural — state that lives lower cascades less:

```jsx
function Dashboard() {
  return (
    <>
      <TickingClock />      {/* interval state lives here now */}
      <ExpensiveReport />   {/* never re-renders */}
    </>
  );
}
```

**2. Lift content up as `children`.** A component's `children` prop is created by whoever renders the JSX — if the parent didn't re-render, the children element is referentially identical and React can skip it:

```jsx
function TickingBorder({ children }) {
  const [tick, setTick] = useState(0);
  // ...ticking logic...
  return <div className={tick % 2 ? 'pulse' : ''}>{children}</div>;
}
```

**3. `React.memo` and friends.** Only after structure can't solve it. `memo` makes the props comparison explicit, and then `useMemo`/`useCallback` exist to keep those props referentially stable. Memoization is a contract — one unstable prop (a fresh object literal, an inline lambda) silently voids it.

## The Compiler Changes the Default

The React Compiler automates the third tool: it memoizes components and values automatically where it can prove safety. What it does not change is the *model* — state still triggers renders, renders still cascade, reconciliation still separates render from commit. Structural fixes (state placement, composition) remain better than memoization because they delete work instead of caching it.

## Takeaways

- Renders are function calls; commits are DOM mutations. Measure before assuming either is your problem.
- Only state changes start a cascade; parents drag children along by default.
- Prefer restructuring (state down, content up) over memoizing.
- Memoization works only while every prop stays referentially stable — treat it as an invariant, not a sprinkle.

React's performance story is mostly about *where state lives*. Get that right, and the rest is usually noise.
