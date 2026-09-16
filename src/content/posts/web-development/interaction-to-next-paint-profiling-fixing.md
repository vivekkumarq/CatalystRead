---
title: "Interaction to Next Paint: Profiling and Fixing Slow Interactions"
slug: "interaction-to-next-paint-profiling-fixing"
description: "A practical walkthrough of measuring Interaction to Next Paint and the concrete techniques for cutting down long input handlers that cause it."
publishedAt: "2026-08-25"
updatedAt: "2026-09-16"
category: "Web Development"
tags:
  - Web Performance
  - Core Web Vitals
  - INP
  - JavaScript
---

Interaction to Next Paint replaced First Input Delay as a Core Web Vital because FID only measured the delay before an event handler *started* running — it said nothing about how long the handler itself took, or the rendering work after it. A click that takes 400ms to actually update the screen passes FID with a great score and fails INP badly, which is a more honest number for what a user actually experiences as lag.

## What INP actually measures

INP tracks the full latency of an interaction — from input to the next frame the browser paints in response — across the entire page lifecycle, then reports roughly the worst one (technically, a high percentile, to avoid one anomalous outlier dominating the score). A "good" INP is under 200ms; anything over 500ms is flagged as poor by Core Web Vitals thresholds.

```javascript
// PerformanceObserver for 'event' entries surfaces individual slow interactions
new PerformanceObserver((list) => {
  for (const entry of list.getEntries()) {
    if (entry.duration > 200) {
      console.log(`Slow interaction: ${entry.name}, ${entry.duration.toFixed(0)}ms`);
    }
  }
}).observe({ type: 'event', durationThreshold: 40, buffered: true });
```

## Finding the actual bottleneck

Chrome DevTools' Performance panel records interactions directly and breaks each one into three phases: input delay (main thread busy with something else when the click happened), processing time (your handler actually running), and presentation delay (time to paint the result after processing finishes). Each phase points to a different fix — input delay means something unrelated is hogging the main thread at the wrong moment, processing time means the handler itself is slow, presentation delay usually means an expensive layout or paint triggered by the handler's DOM changes.

## Breaking up long handlers

A synchronous handler that does everything in one go blocks the main thread from painting until it's completely finished, even if the visual update itself only needed the first few lines:

```javascript
// blocks the next paint until all of this finishes
button.addEventListener('click', () => {
  updateUI();          // fast, and this is what the user is waiting to see
  logAnalytics();       // slow-ish, and irrelevant to the visible result
  recalculateReport();  // genuinely expensive
});
```

`scheduler.yield()` (or `setTimeout(fn, 0)` as a widely-supported fallback) hands control back to the browser between chunks of work, letting it paint before continuing:

```javascript
button.addEventListener('click', async () => {
  updateUI(); // paint-critical work happens first, synchronously

  await scheduler.yield?.() ?? new Promise(r => setTimeout(r, 0));

  logAnalytics();
  recalculateReport();
});
```

Ordering matters as much as the yield itself — do the visually necessary work first, then yield, then do the rest. Yielding before the paint-critical update accomplishes nothing.

## Debouncing input-driven work

For handlers that fire on every keystroke — filtering a list, live-validating a field — debounce the expensive part rather than trying to make every single keystroke's full handler fast:

```javascript
let timeoutId;
input.addEventListener('input', (e) => {
  updateInputValue(e.target.value); // instant visual feedback, every keystroke
  clearTimeout(timeoutId);
  timeoutId = setTimeout(() => runExpensiveFilter(e.target.value), 150); // debounced
});
```

## React and framework-specific culprits

In component-based frameworks, a common INP killer is an event handler that triggers a state update cascading into a large re-render of unrelated UI. Splitting state so an interaction only re-renders what actually changed — rather than a shared parent forcing siblings to re-render too — often fixes INP issues that look like "the framework is slow" but are actually a re-render scope that's wider than it needs to be. Profile first, as with any performance problem: the fix for input delay, processing time, and presentation delay differ enough that guessing wastes the effort.

## A worked failure mode

INP is blamed on the network; a profiler shows a 180ms JSON.parse on the main thread after click. `requestAnimationFrame` work is piled into the same turn. A third-party script uses long tasks. The failure is not measuring the handler. Break up work, defer non-UI, and audit third parties.

## When this is the wrong tool

INP tuning is the wrong tool if the click does a full navigation you wanted. Do not micro-yield a 2ms handler. Profile when field INP is actually bad.

A second, quieter failure is operational: the idea is copied from a talk into a path that has no rollback, no owner, and no metric that would show the invariant breaking. For "Interaction to Next Paint: Profiling and Fixing Slow Interactions", that usually means a Friday deploy with production as the first realistic test. Write down the user-visible symptom, the invariant, and the revert before you scale the pattern. If revert is a data rewrite, you do not have a revert—you have a project. Practice the failure in staging with production-sized data at least once, or you will practice it on customers.
If a dry-run in staging with production-like volume does not reproduce the benefit, do not scale the idea on a hope and a dashboard. Ship the smaller version that you can revert in one deploy.
