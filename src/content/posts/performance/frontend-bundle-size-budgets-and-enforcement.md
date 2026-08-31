---
title: "Frontend Bundle Size Budgets and Enforcement"
slug: "frontend-bundle-size-budgets-and-enforcement"
description: "A bundle size budget that isn't enforced in CI is a suggestion, and suggestions don't survive contact with a deadline — here's how to make it stick."
publishedAt: "2025-04-19"
category: "Performance"
tags:
  - Performance
  - Frontend
  - Bundle Size
  - CI/CD
---

Every frontend team has, at some point, declared that bundle size matters, usually right after a Lighthouse audit or a slow-network demo made the problem visible. Most of those declarations don't survive the next quarter. A budget that lives in a wiki page and not in CI is a value statement, not a control, and value statements lose to shipping deadlines every time there's a conflict.

## Setting a number that means something

A budget stated as "keep the bundle small" isn't actionable. A useful budget is a specific number, tied to a specific measurement, tied to a specific user experience target. Start from the target, not from your current size: if you want a meaningful interaction to be ready within a few seconds on a mid-tier mobile device over a throttled connection, work backward through your target network speed to a byte budget for the JavaScript that has to arrive before that interaction is possible.

This produces a smaller, more defensible number than picking "500KB" because it sounds reasonable. It also naturally separates the budget into what has to load before first interaction versus what can load later — a budget for your initial route's JS is a different, tighter number than a budget for the whole application including every lazy-loaded route.

## Enforcing it where it can't be ignored

A budget only holds if crossing it breaks the build, not just the dashboard. Most bundlers have first-class support for this now.

```javascript
// webpack.config.js
module.exports = {
  performance: {
    maxAssetSize: 250000,
    maxEntrypointSize: 250000,
    hint: "error",
  },
};
```

Setting the hint to `error` rather than `warning` is the whole point — a warning in build output is something everyone has learned to scroll past. A CI job that measures bundle size on every pull request and comments the diff directly on the PR closes the gap between "the budget exists" and "someone notices when a change breaks it," because it puts the number in front of the reviewer at the exact moment a decision is being made, rather than in a monitoring dashboard nobody checks until the quarterly performance review.

Tools like `bundlesize`, `size-limit`, or a bundler's built-in budget feature all serve this role; the specific tool matters less than making the check a required status on the PR rather than an informational one someone can merge past.

## Where budgets get gamed without anyone meaning to

The most common way a budget gets quietly defeated is a large dependency added behind a dynamic import, which keeps the main bundle under budget while the total JS shipped to a user who exercises that code path grows unchecked. This isn't necessarily wrong — code splitting a rarely-used feature is good practice — but a budget that only measures the initial bundle can create an incentive to hide weight behind a lazy boundary rather than actually reduce it. Tracking total JS shipped for your most common user journey, not just the initial chunk, catches this.

The second common failure is a budget that's accurate the day it's set and stale a year later, because nobody revisits it as the application's baseline naturally grows. Treat the budget as something to review on a cadence — quarterly is reasonable — rather than a number set once during a performance push and never touched again. A budget that's too loose to catch real regressions is functionally the same as having no budget, just with worse false confidence attached.

## Making the trade-offs visible

The times a budget gets broken on purpose are usually legitimate — a new dependency genuinely earns its weight. The value of enforcement isn't preventing every increase, it's forcing the increase to be a visible, reviewed decision instead of an accumulation nobody chose. A pull request that fails a size check and gets merged anyway, with a comment explaining why, is the system working correctly. A pull request that silently adds 80KB because nothing flagged it is the system that quietly stopped working months ago.
