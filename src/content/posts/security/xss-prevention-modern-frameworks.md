---
title: "XSS Prevention in Modern Frameworks"
slug: "xss-prevention-modern-frameworks"
description: "React, Vue, and Angular auto-escape by default, but every one of them has an escape hatch that reintroduces XSS — here's where those hatches hide."
publishedAt: "2024-09-09"
updatedAt: "2026-09-16"
category: "Security"
tags:
  - Security
  - XSS
  - Web Security
  - Frontend
---

A lot of teams have quietly stopped thinking about cross-site scripting because their framework auto-escapes template output by default. That confidence is mostly earned — React, Vue, and Angular all treat interpolated strings as text, not markup, unless you explicitly ask them not to. The risk that remains isn't the framework failing at its job; it's the handful of APIs that exist specifically to opt out of that protection, used without anyone stopping to ask why.

## Where the escape hatches live

Every major framework ships an API for rendering raw HTML, and every one of them is named to sound alarming, which helps less than you'd think once it's three call sites deep in a component library. React has `dangerouslySetInnerHTML`, Vue has `v-html`, Angular has `[innerHTML]` combined with `bypassSecurityTrustHtml`. They all do the same thing: take a string and inject it into the DOM without escaping.

```jsx
// This renders whatever is in `comment.body` as live HTML,
// including <script> tags and event handler attributes.
<div dangerouslySetInnerHTML={{ __html: comment.body }} />
```

The pattern that gets teams in trouble isn't using these APIs for trusted, developer-authored content — it's reaching for them because a CMS or a markdown renderer returns HTML and it's the fastest way to display it. The moment that HTML includes anything derived from user input, upstream — a blog comment, a user's bio, a support ticket description — you have a stored XSS vector. Sanitize the string with a dedicated library like DOMPurify immediately before it hits the raw-HTML API, not somewhere upstream where a later refactor can silently drop the step.

## The vectors auto-escaping doesn't cover

Text interpolation is protected. URLs and attributes are a different story. An `href` or `src` bound directly to user input can carry a `javascript:` URI, and depending on the framework and browser, that can execute on click without ever touching `innerHTML`.

```jsx
// A user-controlled href can be javascript:alert(document.cookie)
<a href={user.website}>{user.website}</a>
```

Validate that URLs from user input actually start with `http://` or `https://` before rendering them as links, or route them through a URL parsing library that rejects other schemes outright.

Server-side rendering introduces its own gap: state serialized into the initial HTML payload for hydration is a string being embedded into a script tag, and if it's built with naive string concatenation instead of a proper JSON-safe serializer, an attacker-controlled value containing `</script>` can break out of the intended context entirely.

## Content Security Policy as the backstop

Escaping and sanitization are the primary defense, but they rely on every developer remembering to apply them correctly, every time, forever. A Content Security Policy header is worth adding specifically because it fails safe when someone doesn't: even if an unsanitized string does make it into the DOM, a policy that disallows inline scripts and restricts script sources to your own domains stops most exploitation attempts cold.

```
Content-Security-Policy: script-src 'self'; object-src 'none'; base-uri 'self';
```

Start with report-only mode, since a real application will have violations you don't expect — inline event handlers, third-party widgets, analytics snippets — and you want visibility into those before you start blocking traffic. Once the report queue is quiet, flip to enforcing mode. CSP won't catch everything, and it's not a substitute for sanitizing input, but it's the layer that survives the next time someone new to the codebase reaches for the raw-HTML escape hatch without knowing why it's dangerous.

## A worked failure mode

React is used so XSS is "impossible," then `dangerouslySetInnerHTML` renders CMS HTML. Angular `bypassSecurityTrustHtml` copies from a Stack Overflow. A markdown renderer allows raw HTML. The failure is a framework guarantee you opted out of. Sanitize with a maintained policy, or do not render HTML.

## When this is the wrong tool

A sanitizer is the wrong tool if you can use text content. Frameworks are the wrong excuse to skip CSP. Do not write HTML concatenations in 2026. Stay in default encoding; sanitize only with a policy you test.

A second, quieter failure is operational: the idea is copied from a talk into a path that has no rollback, no owner, and no metric that would show the invariant breaking. For "XSS Prevention in Modern Frameworks", that usually means a Friday deploy with production as the first realistic test. Write down the user-visible symptom, the invariant, and the revert before you scale the pattern. If revert is a data rewrite, you do not have a revert—you have a project. Practice the failure in staging with production-sized data at least once, or you will practice it on customers.
If a dry-run in staging with production-like volume does not reproduce the benefit, do not scale the idea on a hope and a dashboard. Ship the smaller version that you can revert in one deploy.
