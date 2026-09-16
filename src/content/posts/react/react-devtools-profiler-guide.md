---
title: "Profiling React Apps with the DevTools Profiler"
slug: "react-devtools-profiler-guide"
description: "A practical guide to using the React DevTools Profiler to find unnecessary re-renders and expensive commits before reaching for memoization."
publishedAt: "2026-06-16"
updatedAt: "2026-09-16"
category: "React"
tags:
  - React
  - Performance
  - Developer Tools
  - Debugging
---

Sprinkling `React.memo` and `useMemo` across a codebase without measuring first is how you end up with code that's harder to read and no faster than before — memoization has its own comparison cost, and applying it to a component that wasn't the bottleneck is pure overhead. The Profiler tab in React DevTools exists to answer the question "what's actually slow" before you touch anything, and reading its output correctly is the difference between a targeted fix and guesswork.

## Recording a profile

Open the Profiler tab, hit record, perform the interaction you suspect is slow — typing in a search box, opening a panel, scrolling a list — and stop recording. Each render produces a "commit," and the flame graph shows every component that rendered during that commit, sized by render duration.

```jsx
// wrap a suspect subtree in the Profiler API for programmatic measurement,
// useful for automated regression checks outside the DevTools UI itself
import { Profiler } from 'react';

function onRenderCallback(id, phase, actualDuration) {
  if (actualDuration > 16) {
    console.warn(`${id} took ${actualDuration.toFixed(1)}ms during ${phase}`);
  }
}

<Profiler id="SearchResults" onRender={onRenderCallback}>
  <SearchResults query={query} />
</Profiler>
```

The 16ms threshold there isn't arbitrary — it's roughly one frame budget at 60fps, so anything over it is a candidate for dropped frames during the interaction.

## Reading the flame graph correctly

Bar width represents render time, and color intensity (in the default theme) indicates relative cost within that commit — yellow and orange bars are the ones actually worth investigating. Gray bars mean the component didn't render at all during that commit, which is useful for confirming that `memo` is working as intended.

The trap: a wide bar for a parent component doesn't necessarily mean the parent's own logic is slow — it usually means everything underneath it re-rendered too, and the parent's bar includes that entire subtree's time. Click into the commit and check each child's individual bar before concluding the parent needs optimization; the actual expensive component might be three levels down.

## "Why did this render?"

Click any bar and the sidebar shows why that component re-rendered — props changed, state changed, or a parent re-rendered without a memoization boundary stopping propagation. This is usually more useful than the timing itself, because it points directly at the fix: if a component re-rendered purely because its parent did, and its own props are referentially unchanged, wrapping it in `memo` will actually help. If it re-rendered because a prop's value genuinely changed, no amount of memoization fixes that — the fix belongs upstream, in whether that prop needed to change at all.

## Ranked view for finding the worst offenders across a session

Instead of a single commit's flame graph, the ranked view lists every component from a recorded session sorted by total render time, which is the fastest way to find the one component responsible for most of the profiling session's cost rather than eyeballing individual commits.

## A workflow that avoids wasted memoization

Record before touching code, identify the actual slow commit and the actual slow component within it (not just the widest bar), check the "why did this render" reason, and only then decide between `memo`, `useMemo`, moving state down closer to where it's used, or splitting a component so unrelated state doesn't force sibling re-renders. Re-record after the change and confirm the specific commit actually got faster — profiling before and after is what turns a plausible-sounding optimization into a verified one.

## A worked example

You record a click on "Sort". The flamegraph shows `App` then `Table` then 500 `Row`s. Ranked view puts `Row` at the top of commit time. You see props as "changed" because `style={{}}` is new. You hoist the style, re-profile, and Row commits drop. Why-did-you-render or the compiler then confirm.

For INP, you also look at the browser performance panel; DevTools Profiler is React commits, not paint.

## Failure modes

Profiling with React DevTools extension in production mode without profiling build — missing info. Recording 60s of idle. Interpreting yellow as "slow" without reading ms. Comparing two profiles with different data sizes. Ignoring the commit that happened because of Strict Mode double render in dev.

Using the profiler to argue about 0.2ms.

## When this is the wrong tool

It will not show CSS layout or network. For allocation, use the memory panel. For server render time, use server logs. If the app is not React, this is the wrong profiler. Do not profile a Redux DevTools time-travel session as if it were user traffic. Lighthouse is the wrong substitute for a commit flamegraph when the question is "why did Table render."
