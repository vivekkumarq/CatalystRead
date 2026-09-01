---
title: "The Origin of React: UI as a Function of State"
slug: "meta-react-ui-as-a-function-of-state"
description: "How Facebook's Ads team, wrestling with cascading manual DOM updates, built React around declarative rendering and a virtual DOM diff."
publishedAt: "2026-03-04"
category: "Meta"
tags:
  - Engineering at Scale
  - Meta
  - React
  - Frontend
---

Before React, building a UI that stayed correct as data changed generally meant writing imperative code: when this value updates, find that DOM node and mutate it, then remember to update the three other places on the page that also depended on it. Facebook's Ads team, dealing with an interface where a single change — like editing a targeting rule — could ripple into needing updates in a dozen different places on screen, felt this pain directly. Keeping all the manual DOM mutations in sync as the app's complexity grew was a losing battle: it was easy to update most of the affected DOM but miss one, leaving the UI silently out of sync with the underlying data.

## Declarative rendering: describe the result, not the steps

React's core idea, developed initially by Jordan Walke and shipped by Facebook's Ads team before being open sourced in 2013, was to let developers describe what the UI should look like for a given state, as a function, rather than write the imperative steps to transform the UI from one state to the next. Instead of "find this node and change its text," a component simply re-renders its whole description whenever its state changes, and something else figures out what actually needs to change in the real DOM. This shifted an entire category of bugs — inconsistent UI because some manual update path was missed — from something developers had to get right by discipline into something the framework guaranteed by construction.

## The virtual DOM as the practical enabler

Re-rendering a full description on every state change sounds wasteful if taken literally — real DOM operations are comparatively expensive, and re-creating the entire DOM tree on every keystroke would be far too slow for interactive UIs. React's answer was the virtual DOM: a lightweight in-memory representation of what the UI should look like, which React diffs against the previous version to compute the minimal set of actual DOM operations needed, and applies only those. Developers got to keep writing simple, declarative "just describe the current state" code, while React's diffing algorithm did the more complex work of figuring out an efficient real-world update underneath, without either side needing to compromise.

## Components as the unit of reasoning

The other piece that mattered as much as declarative rendering was componentization: breaking a UI into self-contained pieces, each owning its own logic and rendering, that could be composed into larger interfaces. This let large frontend codebases scale in a way that mirrored how backend teams already broke large systems into smaller services — a component could be reasoned about, tested, and modified largely in isolation from the rest of the page, rather than requiring an understanding of the entire page's mutation logic to change a small part of it safely.

## What you can borrow

- If your codebase has a recurring bug pattern of "we updated the data but forgot to update some place that displayed it," a declarative rendering model that derives UI from state eliminates that entire bug class rather than requiring more discipline to catch it.
- A diffing layer that lets you write simple code while it computes efficient underlying operations is a powerful pattern beyond UI — anywhere the naive "just redo everything" approach is correct but too slow.
- Breaking a large system into self-contained, composable units (components, services, modules) makes each piece separately reasonable about, independent of whether the underlying domain is frontend, backend, or something else entirely.
- Sometimes the right fix for a scaling pain point isn't more process or more careful engineers — it's a different underlying model that makes the class of mistake structurally impossible.
