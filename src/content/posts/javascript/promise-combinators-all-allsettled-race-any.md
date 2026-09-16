---
title: "Promise.all, allSettled, race, and any: Picking the Right Combinator"
slug: "promise-combinators-all-allsettled-race-any"
description: "A practical guide to choosing between Promise.all, allSettled, race, and any, with the failure modes each one is actually designed to handle."
publishedAt: "2025-07-27"
updatedAt: "2026-09-16"
category: "JavaScript"
tags:
  - Promises
  - JavaScript
  - Async/Await
  - Error Handling
  - Node.js
---

Four combinators, four very different failure semantics, and I still regularly see `Promise.all` used in places where a single failed request shouldn't take down an entire page. Picking the right one isn't about memorizing the API — it's about being honest with yourself about what "partial failure" means for the specific batch of work you're running.

## Promise.all: all-or-nothing

`Promise.all` resolves when every promise resolves, and rejects the instant any one of them rejects — the others keep running in the background, but you no longer get their results. This is correct when the operations are genuinely dependent: you can't render a dashboard with three of four required data sources.

```javascript
async function loadDashboard(userId) {
  const [profile, billing, permissions] = await Promise.all([
    fetchProfile(userId),
    fetchBilling(userId),
    fetchPermissions(userId),
  ]);
  return { profile, billing, permissions };
}
```

If `fetchBilling` throws, the whole function throws, and the caller decides what "dashboard failed to load" looks like. That's the right behavior when all three are required to render anything meaningful.

## Promise.allSettled: best-effort aggregation

When failure of one item shouldn't sink the rest, `allSettled` is the combinator, not a hand-rolled `.catch` on each promise. It never rejects — every entry resolves to `{ status: 'fulfilled', value }` or `{ status: 'rejected', reason }`.

```javascript
async function refreshAllFeeds(feedUrls) {
  const results = await Promise.allSettled(feedUrls.map(fetchFeed));

  const succeeded = results
    .filter((r) => r.status === 'fulfilled')
    .map((r) => r.value);
  const failed = results
    .filter((r) => r.status === 'rejected')
    .map((r) => r.reason);

  if (failed.length) logFeedFailures(failed);
  return succeeded;
}
```

This is the right shape for anything like "sync 40 integrations, show whichever ones worked." Reaching for `Promise.all` with a try/catch around the whole thing instead just throws away which specific item failed — you get an error, not a report.

## Promise.race: first to settle wins, good or bad

`race` resolves or rejects as soon as any input promise settles, in either direction. That "either direction" part is the part people forget — a race between a fetch and a timeout will reject if the fetch itself throws faster than the timeout fires, which is usually fine, but it means `race` is not automatically a clean timeout wrapper unless you handle both branches.

```javascript
function withTimeout(promise, ms) {
  const timeout = new Promise((_, reject) =>
    setTimeout(() => reject(new Error(`Timed out after ${ms}ms`)), ms)
  );
  return Promise.race([promise, timeout]);
}

const data = await withTimeout(fetchLargeReport(), 5000);
```

One caveat worth knowing: the losing promise doesn't get cancelled. `fetchLargeReport()` keeps running even after the timeout wins the race, so if it eventually rejects and nothing is listening, you'll get an unhandled rejection warning. Attach a no-op `.catch` on the original promise if you don't want that noise.

## Promise.any: first success wins, failures are noise until they all fail

`any` is the mirror image of `race` restricted to the success case — it resolves with the first fulfilled promise and only rejects if *every* promise rejects, bundling all the reasons into an `AggregateError`.

```javascript
async function fetchFromFastestMirror(urls) {
  try {
    return await Promise.any(urls.map((url) => fetch(url).then((r) => r.json())));
  } catch (err) {
    // err is an AggregateError; err.errors is the array of individual reasons
    throw new Error(`All ${urls.length} mirrors failed`);
  }
}
```

This is the combinator for redundancy: multiple CDNs serving the same asset, multiple regions serving the same API, retry racing across replicas. Nobody cares that two of five mirrors were down if the third one answered.

## The mistake that shows up most

The recurring bug across all four is treating `Promise.all` as the default and only reaching for `allSettled` after a postmortem. If you're fanning out to more than two independent operations, ask explicitly whether one failure should void the others — that answer tells you which combinator you actually need, before you write the code.

## A worked failure mode

`Promise.all` on five independent APIs fails the page if one ads pixel 500s. `race` is used for timeout but the loser keeps running and mutating state. `any` hides the first success from a flaky server that returned an empty body. The failure is the wrong combinator. Use `allSettled` for independent side displays, abort the losers on timeout, and define success.

## When this is the wrong tool

`all` is the wrong tool for optional widgets. `race` is the wrong timeout if you cannot cancel. Combinators are not a substitute for a real scheduler. Pick the failure policy first.

When this pattern is stretched past its assumptions, the first outage looks like a mysterious performance cliff instead of a design limit. "Promise.all, allSettled, race, and any: Picking the Right Combinator" fails that way when traffic mix, data shape, or team skill does not match the blog that sold the approach. Keep a kill switch: feature flag, smaller blast radius, or an older path that still works. Measure the thing the idea claims to improve, not a vanity graph. If you cannot name a workload where you would refuse to use it, you have not finished the design.
