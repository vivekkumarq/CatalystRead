---
title: "Speculation Rules: Prefetch and Prerender Without Wrecking Analytics"
slug: "speculation-rules-and-instant-navigation"
description: "How the Speculation Rules API differs from rel=prefetch, when prerender is safe, and how to avoid double pageviews and stampedes on search-as-you-type."
publishedAt: "2026-09-15"
category: "Web Development"
tags:
  - Web Development
  - Performance
  - Navigation
  - Chrome
sources:
  - title: "Speculation Rules API"
    publisher: "MDN / Chrome for Developers"
    url: "https://developer.mozilla.org/en-US/docs/Web/API/Speculation_Rules_API"
---

The fastest navigation is the one that already happened in the background. Speculation Rules let you declare JSON in a script tag (or a header) that tells supporting browsers to **prefetch** or **prerender** likely next URLs. Unlike a scatter of `<link rel="prefetch">` tags, you can match document URLs with `where` clauses and set eagerness (`conservative`, `moderate`, `eager`).

## Prefetch versus prerender

Prefetch downloads the HTML (and depending on configuration, more). Prerender speculatively loads the page in a hidden navigational context, running JS. Prerender is faster when you guess right and expensive when you guess wrong — CPU, battery, and server QPS.

```html
<script type="speculationrules">
{
  "prerender": [{
    "where": { "href_matches": "/articles/*" },
    "eagerness": "moderate"
  }]
}
</script>
```

Do not prerender URLs that increment a "view" counter on GET, charge an API quota, or start a websocket. Those GETs are no longer "just a hover." Prefetch is milder but still hits your origin.

## Analytics and ads

Hidden prerenders have historically double-fired analytics. Use the prerendering APIs (`document.prerendering`, `prerenderingchange`) to delay `gtag` pageviews until activation. If your measurement vendor is old, test or you will inflate traffic after a "performance win."

## What not to speculate

Authenticated bank dashboards, logout links, add-to-cart GETs (they should not be GETs), and typeahead endpoints. Search-as-you-type plus eager prefetch is a self-inflicted DDoS.

Start with moderate prefetch of article-to-article links on a content site (this publication's shape). Measure extra bandwidth and bounce. Promote to prerender only for a small set of high-probability next URLs. Instant is a budget, not a default.
