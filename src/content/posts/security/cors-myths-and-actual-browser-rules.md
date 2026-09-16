---
title: "CORS, Without the Folklore: What the Browser Actually Checks"
slug: "cors-myths-and-actual-browser-rules"
description: "Simple vs preflighted requests, why Access-Control-Allow-Origin cannot be * with credentials, and what CORS never was (a server-side access control system)."
publishedAt: "2026-09-08"
updatedAt: "2026-09-16"
category: "Security"
tags:
  - Security
  - CORS
  - HTTP
  - Web Development
sources:
  - title: "Cross-Origin Resource Sharing (CORS)"
    publisher: "Fetch Standard / MDN"
    url: "https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS"
---

CORS is a **browser** policy about whether JavaScript in origin A may read a response from origin B. It is not a firewall. A mobile app, `curl`, and a malicious server-side program can still hit the URL. If you "secured" a JSON API with `Access-Control-Allow-Origin` and no auth, you secured the *reading of the response in a stranger's browser*, not the API.

## Simple requests versus preflight

A GET with ordinary headers goes to the server immediately. If the response lacks the right `Access-Control-Allow-Origin`, JS cannot read the body; the request still happened. A PUT, or a `Content-Type: application/json` POST, or a custom header, triggers a preflight `OPTIONS` first. The browser asks permission; if OPTIONS fails, the real request never fires.

That is why "it works in Postman but fails in the SPA" is the most common CORS ticket. Postman does not implement CORS.

```http
Access-Control-Allow-Origin: https://app.example.com
Access-Control-Allow-Credentials: true
Vary: Origin
```

You cannot combine `Allow-Origin: *` with credentials. The spec forbids it so a random site cannot silently use the user's cookies against you *and* read the result. Reflecting any `Origin` header without a allowlist is the same bug with extra steps.

## What to put on the server

Allowlist exact SPA origins. Expose only the headers the client must read (`Authorization` is request-side; `ETag` might be response-side). Keep preflight `Max-Age` reasonable so you are not OPTIONS-flooding, but not so long that a header policy change takes a day to roll out in cached preflights.

CSRF is a different problem. CORS does not replace anti-CSRF tokens for cookie-authenticated form posts from other origins; in fact cookie SPA architectures need both a tight CORS allowlist *and* CSRF defenses depending on the cookie's `SameSite` story.

When a ticket says "add CORS," ask whether they mean "the SPA cannot parse JSON" or "we need to block the internet from calling us." Only the first is CORS. The second is authentication, network policy, or both.

## A worked preflight

The SPA at `https://app.example.com` POSTs `application/json` with `Authorization: Bearer …`. The browser sends OPTIONS with `Access-Control-Request-Method: POST` and `Access-Control-Request-Headers: authorization,content-type`. The API must answer those headers in `Allow-Methods` and `Allow-Headers`, plus an exact `Allow-Origin` (not `*` with credentials — and Bearer-in-header usually does not need credentials mode, which is a separate fork).

If the SPA uses `fetch(url, { credentials: "include" })` for cookie sessions, `Allow-Credentials: true` is required and `Allow-Origin` must echo a single allowlisted origin. Forgetting `Vary: Origin` on a CDN means one client’s origin gets cached for everyone else, and the second SPA origin fails randomly.

A missing OPTIONS route on the load balancer is the other classic: nginx returns 405, the browser never sends POST, and the API logs look empty. Fix the gateway, not the Angular `HttpClient`.

## Failure modes

**Reflecting `Origin`.** `Allow-Origin: <whatever the request sent>` with credentials is “allow any website to read this user’s responses.” Allowlist exact origins. Subdomains like `*.example.com` are still a policy; `null` as Origin (sandboxed iframe, some redirects) should not be allowlisted.

**Thinking CORS hides the API.** Scrapers and mobile apps ignore it. Secrets go in tokens or mTLS, not in the absence of a header.

**`Access-Control-Allow-Headers: *` as a habit.** Some browsers treat `*` differently with credentials. Name the headers you actually send. Custom `X-` headers are why you have a preflight in the first place.

**Cached preflight vs a policy change.** `Max-Age: 86400` means a removed header stays allowed in that browser for a day. Shorten Max-Age before a breaking header change, then lengthen it again.

## When CORS is the wrong ticket

Blocking a partner’s server-to-server call is firewall or IAM. First-party form posts that should not run cross-site are CSRF and `SameSite`. Reading a font or image in CSS is often a different CORS mode (`crossorigin` on the tag). Do not paste the JSON API allowlist onto a static asset bucket unless you meant to.

## Review checklist

- Allowlist exact SPA origins; never `*` with cookies.
- OPTIONS reaches the app or is answered correctly at the edge; `Vary: Origin` on varying responses.
- Credentials mode matches the actual auth (cookies vs Bearer).
- CSRF is decided separately from CORS for cookie apps.
