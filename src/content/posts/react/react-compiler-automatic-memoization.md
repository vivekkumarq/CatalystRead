---
title: "React Compiler: Automatic Memoization and the Rules It Still Needs You to Follow"
slug: "react-compiler-automatic-memoization"
description: "What the compiler memoizes, which useMemo calls become redundant, and the purity rules that make it bail out of a component."
publishedAt: "2026-09-07"
updatedAt: "2026-09-16"
category: "React"
tags:
  - React
  - Performance
  - Compilers
  - Frontend Engineering
sources:
  - title: "React Compiler"
    publisher: "React Documentation"
    url: "https://react.dev/learn/react-compiler"
---

For years the advice was `useMemo`, `useCallback`, and `React.memo` sprinkled until the profiler went quiet. The React Compiler (the "React Forget" line of work) analyzes your function components and inserts memoization where it can prove values are safe to reuse. The pitch is not "never think about renders." It is "stop writing dependency arrays that lie."

## What it is allowed to cache

The compiler assumes components are **pure with respect to props, state, and the hooks they call**: same inputs, same JSX and side-effect schedule. Mutation of a prop object during render, reading `Date.now()` to decide children, or writing a ref during render in a way that affects output can make it bail out and leave the component unoptimized.

When it succeeds, extra `useMemo` around a mapped list often becomes noise. You can delete it after you confirm the compiler ran on that file (the ESLint plugin and compiler runtime logs are there for this). Blindly deleting every memo in a codebase that is not compiled yet is still a regression.

## Rules of React are now mechanical

The compiler encodes rules humans used to debate:

- Do not mutate props or hook return values.
- Side effects belong in effects, event handlers, or server actions — not in the render path that the compiler wants to skip.
- Hooks still have to be unconditional; the compiler is not a license to `if` a `useState`.

If a third-party component mutates arrays it receives, wrapping it in a compiler-optimized parent will not save you. Purity is a property of the whole subtree's data flow.

## Measuring instead of believing the blog post

Compile a route, then look at React DevTools "rendered at" and the compiler's "memo slots." If a leaf still renders because the parent creates a new `style={{}}` object that the compiler could not hoist, you still have a data-flow problem — just a smaller one.

Keep `key` discipline; the compiler does not fix list identity. Keep splitting giant components when they do unrelated work; memoization of a 2,000-line component that always invalidates is a slower render of the same mess.

Adopt the compiler when your React version and build pipeline support it, with the lint plugin on from day one. Treat remaining `useMemo` as documentation of a constraint the compiler could not see — a cache keyed by a Map, a stable subscription handle — not as a house style.

## A worked example

A list parent maps rows and passes `onSelect={() => select(row.id)}`. Before the compiler, that new function broke `React.memo` on each row. After compilation, the compiler caches the callback per `row.id` when it can prove purity. You delete a hand-written `useCallback` that listed the wrong deps. Confirm with the compiler's eslint rule and a DevTools highlight: selecting one row should not paint every row.

A counterexample: `rows.sort()` during render mutates the prop array. The compiler bails out. Copy first: `rows.toSorted()`.

## Failure modes

Mutating refs during render to stash "previous props" in a way that changes output. Reading `window.innerWidth` in render without subscribing. Spreading props into a child (`{...obj}`) where `obj` is a new object every time and the compiler cannot hoist. Incompatible libraries that mutate drafts. Enabling the compiler only on some routes so performance "depends on which folder you edited."

False confidence: deleting `useMemo` in a file excluded from compilation.

## When this is the wrong tool

The compiler will not fix waterfalls, huge lists, or CSS thrash. Do not adopt it as a substitute for `key` correctness or for moving work off the main thread. If you are on a React version without compiler support, keep manual memoization. It is the wrong tool for impure rendering that is load-bearing (legacy ads code). For a 20-line component that renders rarely, compiler output is noise. Measure a route; do not enable it only because a keynote said memoization is over.

## Review checklist

- Lint plugin is on wherever the compiler runs; files excluded from compile keep their `useMemo`.
- Purity bailouts are treated as bugs in the component, not as “turn the compiler off.”
- Keys and list identity are unchanged; compiler is not a substitute.
- DevTools still shows which leaves render after a parent state tick.
