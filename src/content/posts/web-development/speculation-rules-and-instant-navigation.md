---
title: "Speculation Rules: Prefetch and Prerender Without Wrecking Analytics"
slug: "speculation-rules-and-instant-navigation"
description: "How the Speculation Rules API differs from rel=prefetch, when prerender is safe, and how to avoid double pageviews and stampedes on search-as-you-type."
publishedAt: "2026-09-15"
updatedAt: "2026-09-16"
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

## A worked path on a content site

Ship prefetch first, with `eagerness: "moderate"` and an `href_matches` list that only covers canonical article URLs. Exclude query strings (`?utm_`, pagination, print views) or you will prefetch the same essay ten ways. After a week, look at three numbers: extra origin bandwidth, cache-hit rate on speculated HTML, and whether bounce or engagement moved. If bandwidth rose and bounce did not fall, the guesses are wrong — tighten the matcher before you prerender.

Promote a *named* list of next URLs to prerender: next chapter, “continue reading,” the logged-out homepage. Named lists are easier to reason about than a glob when a CMS editor adds `/articles/preview/*`. Keep prerender off for anything that runs a checkout, a paywall meter, or a personalization GET that writes a last-seen cookie.

On activation, gate third-party tags:

```javascript
if (document.prerendering) {
  document.addEventListener("prerenderingchange", startBeacons, { once: true });
} else {
  startBeacons();
}
```

If `startBeacons` also boots ads, those slots must wait too. An ad auction in a hidden prerender is both wasted money and a policy problem with some networks.

## Failure modes that look like a performance win

**Stampede.** A listing page with fifty article cards and `eager` prefetch will fire fifty GETs on first paint. Conservative or moderate eagerness exists because hover/pointer intent is a better prior than “everything in the DOM.”

**Auth cookies on prerender.** A prerender of `/account` can run authenticated JS against a session the user did not mean to “visit.” Prefer prefetch-only for logged-in surfaces, or restrict speculation to public origins.

**CDN cache poisoning of the guess.** If your HTML varies on `Cookie` or `Accept-Language` and the speculation request is a cache miss with a different cookie jar, you prerender the wrong variant and then swap it on activation. Vary and cache keys must match real navigations.

**BFCache and prerender together.** Back-forward cache and speculation both create “the page existed before the click.” Do not assume `pageshow` and `prerenderingchange` are interchangeable; test both.

## Review checklist

- Matcher cannot hit logout, cart, search-as-you-type, or unbounded query strings.
- Analytics and ads wait for activation; a QA run compares pageview counts with speculation off.
- Prefetch is the default; prerender is an allowlist with a measured bandwidth budget.
- Origin rate limits and WAF rules treat speculation QPS as real traffic, because it is.

## A worked failure mode

Prerender is enabled for every link including logout and checkout; analytics double-count and a prerender hits a billed API. A same-origin rule prerenders a page that depends on POST state. The failure is speculation without an allow-list. Restrict to cheap GETs, exclude authenticated mutating paths, and de-dupe analytics.

## When this is the wrong tool

Speculation rules are the wrong tool if the next page is personalized and expensive. Do not prerender the whole site on mobile data. Use them for likely, cheap, idempotent next views.

A second, quieter failure is operational: the idea is copied from a talk into a path that has no rollback, no owner, and no metric that would show the invariant breaking. For "Speculation Rules: Prefetch and Prerender Without Wrecking Analytics", that usually means a Friday deploy with production as the first realistic test. Write down the user-visible symptom, the invariant, and the revert before you scale the pattern. If revert is a data rewrite, you do not have a revert—you have a project. Practice the failure in staging with production-sized data at least once, or you will practice it on customers.
