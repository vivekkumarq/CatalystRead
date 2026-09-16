---
title: "Prefetch, Prerender, and Privacy: Speculation That Can Leak Intent"
slug: "web-prefetch-prerender-privacy"
description: "Link rel=prefetch, Speculation Rules, and why prerendering URLs with tokens or personalization is a data leak as much as a performance win."
publishedAt: "2026-09-15"
category: "Web Development"
tags:
  - Web Development
  - Performance
  - Privacy
  - Speculation Rules
sources:
  - title: "Speculation Rules"
    publisher: "WICG"
    url: "https://wicg.github.io/nav-speculation/speculation-rules.html"
  - title: "Referrer Policy"
    publisher: "W3C"
    url: "https://www.w3.org/TR/referrer-policy/"
---

Browsers will **prefetch** a URL (download, maybe not execute) or **prerender** (run the page in a hidden context) to make the next navigation feel instant. Speculation Rules and `rel=prefetch` are how sites opt in. The privacy problem is simple: a prefetch is a **network request** to an origin the user has not committed to visiting. If that URL contains an email, a session-shaped token, or "next article the model thinks you'll read," you just told the destination — and any observer on the path — something the user did not confirm.

There is already a speculation-rules performance article on this site. This one is the **privacy and credential** half.

## What actually goes on the wire

Prefetch may use a partitioned cache and a less-privileged context, but it still hits your analytics if you do not distinguish `Sec-Purpose: prefetch` (or equivalent) from a real view. Counting prefetches as "reads" inflates metrics and can fire marketing pixels. Prerender can run JS; a prerender that `POST`s "user viewed" is a bug.

```html
<script type="speculationrules">
{ "prerender": [{ "where": { "href_matches": "/docs/*" } }] }
</script>
```

Do not match `/account/*`, logout URLs, or anything with a one-time token. Do not prerender third-party checkout. Cross-origin speculation is extra sensitive: it can leak **that the user was on your site** to another origin via the request.

## Referrers and cookies

A prefetch with a full referrer URL that contains a query token leaks. Set a strict referrer policy. Cross-site cookies in prerender are constrained by the browser; do not rely on "hidden page" to skip consent. SameSite and CHIPS still apply.

User preferences: `Save-Data`, reduced data, and some privacy modes reduce speculation. Respect them; forcing prefetch against a hint is hostile.

## A policy

Allowlist public docs and marketing. Deny authenticated app shells. Deduplicate analytics on prefetch. Document `Sec-Purpose` in the logging pipeline. If legal cares about "processing before click," speculation is processing.

Read Speculation Rules' privacy considerations and referrer policy. Then grep for `prefetch` URLs that include query params with PII. Instant navigation is not a reason to GET the password-reset link in the background. The fastest page is still the one you were allowed to request.
