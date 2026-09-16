---
title: "ShadowRealms: Where the Proposal Stands, and What Isolation You Should Use Today"
slug: "javascript-shadow-realms-status"
description: "TC39 ShadowRealm: a fresh global for untrusted JS, how it differs from iframes and workers, and why production isolation is still not 'just new ShadowRealm'."
publishedAt: "2026-09-14"
category: "JavaScript"
tags:
  - JavaScript
  - Isolation
  - TC39
  - Security
sources:
  - title: "ShadowRealm proposal"
    publisher: "TC39"
    url: "https://github.com/tc39/proposal-shadowrealm"
  - title: "HTML realm / iframe sandbox"
    publisher: "HTML living standard"
    url: "https://html.spec.whatwg.org/"
---

A **ShadowRealm** is a TC39 proposal for a **new JavaScript global** with its own intrinsics (`Array`, `Object`) that can `evaluate` strings or import modules **without sharing identity** of those intrinsics with the host. Values that cross the boundary are copied or wrapped according to the spec (functions become wrapped). The pitch is: run plugin code without giving it your `Array.prototype` to mutate.

## Status, not a tutorial to ship

Track the proposal's stage on the TC39 repo. It has moved, stalled, and been redesigned more than once (realms, frozen realms, SES). **Do not** write a 2026 production security boundary that only exists if `new ShadowRealm()` is in Baseline. Check engines: experimental flags are not a CSP.

What you can use **today** for isolation:

- **Workers**: separate event loop, structured clone, no DOM. Good for CPU and some untrusted JS with a tight API.
- **iframes** with `sandbox` and a different origin: DOM isolation, heavy.
- **SES / Compartments** (Agoric and Lockdown): shimmed realms for some runtimes.
- **Server-side** VMs (isolates, separate processes): still the honest story for multi-tenant eval.

ShadowRealm, when shipped, still needs a **membrane** for the API you expose. A realm that receives your `fetch` is not isolated from the network. The proposal is about JS object identity, not a browser security chrome.

## Why identity matters

If plugin code does `Array.prototype.map = stolen`, your app breaks. Separate intrinsics stop that class of prototype pollution. They do not stop infinite loops (need timeouts), memory bombs (need isolate limits), or confused-deputy APIs you passed in.

```js
// hypothetical
const r = new ShadowRealm();
const result = await r.evaluate('1 + 1');
```

Until that is standard everywhere, this snippet is a wish.

Read the proposal README for the current stage and the SES docs if you need compartmentalization now. Then put untrusted code in a worker or a process. Language-level realms are coming for a reason; shipping eval in the page global is still the bug. Status pages age fast — verify the stage before you design a plugin system around the constructor name.
