---
title: "Angular Hydration and Event Replay: Making SSR Clicks Count"
slug: "angular-hydration-event-replay"
description: "Non-destructive hydration, event replay, and the mismatches that force a full client rebuild — plus incremental hydration for heavy islands."
publishedAt: "2026-09-01"
category: "Angular"
tags:
  - Angular
  - SSR
  - Hydration
  - Performance
sources:
  - title: "Hydration"
    publisher: "Angular docs"
    url: "https://angular.dev/guide/hydration"
  - title: "Event Replay"
    publisher: "Angular docs"
    url: "https://angular.dev/guide/hydration#event-replay"
---

SSR sends HTML. The browser paints. Then JavaScript boots and Angular must **attach** to that DOM without throwing it away. **Non-destructive hydration** reuses server nodes. **Event replay** records clicks that happened **before** listeners existed and replays them after hydration so a fast user is not ignored. Without replay, "I clicked Add and nothing happened" is a hydration bug, not a product bug.

## Mismatch is the hard failure

If the server rendered "Hello" and the client first pass wants a different text (timezones, random ids, `Date.now()` in the template), Angular may discard the node and rebuild. That costs performance and can lose replay. Make the first client render **byte-compatible** with the server: `provideClientHydration()`, stable `@if` branches, no `Math.random()` in templates. Transfer state (`TransferState` / `httpTransferCache`) so the client does not refetch and flash.

```ts
provideClientHydration(withEventReplay());
```

Event replay uses a listener at the document level during bootstrap (with a small script). Know that third-party scripts that stop propagation can eat events. Test click-during-load on a throttled CPU.

## Incremental hydration

Later Angular versions can hydrate **on demand** (idle, viewport, interaction). Heavy below-the-fold widgets stay HTML until needed. Mark those components explicitly; a wrong boundary hydrates too much or never becomes interactive.

i18n and hydration: locale must match. Auth: server-rendered anonymous HTML + client logged-in tree is a mismatch by design — render a generic shell or skip SSR for that subtree.

## Debugging

Enable hydration mismatch warnings in dev. Look for comments Angular injects in the HTML. If you see a full client render in the profiler after SSR, hydration failed closed.

Read the hydration guide's constraints (no direct DOM manipulation before hydrate, careful with `<body>`). Then click the primary CTA while the bundle is still downloading. If the click is lost, replay is off or a mismatch destroyed the node. That click is the whole SSR UX bet.
