---
title: "CORS, Without the Folklore: What the Browser Actually Checks"
slug: "cors-myths-and-actual-browser-rules"
description: "Simple vs preflighted requests, why Access-Control-Allow-Origin cannot be * with credentials, and what CORS never was (a server-side access control system)."
publishedAt: "2026-09-08"
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
