---
title: "CSRF: When You Still Need to Care"
slug: "csrf-when-you-still-need-to-care"
description: "SameSite cookies made CSRF less of a default threat, but the attack is far from dead for APIs using cookie auth, subdomains, or older browsers."
publishedAt: "2024-10-14"
category: "Security"
tags:
  - Security
  - CSRF
  - Web Security
  - Authentication
---

Cross-site request forgery has a reputation for being a solved problem, and for a large slice of modern applications, that reputation is roughly accurate. `SameSite=Lax`, which browsers have defaulted cookies to for several years now, blocks the classic version of the attack: a malicious page auto-submitting a form to your bank's transfer endpoint, relying on the browser to attach your session cookie automatically. That default changed the threat model. It didn't eliminate it.

## What actually still breaks

The first thing worth checking is whether your application actually relies on the browser default, or whether something in your stack overrides it. Cookies set with `SameSite=None` — often done to support an embedded iframe or a cross-domain widget — opt back into the old behavior entirely. If any part of your authentication flow sets a cookie this way, that cookie is exactly as vulnerable to CSRF as it would have been in 2015.

```
# This cookie is protected against cross-site requests
Set-Cookie: session=abc123; SameSite=Lax; Secure; HttpOnly

# This one isn't
Set-Cookie: session=abc123; SameSite=None; Secure; HttpOnly
```

Subdomains are the second gap. `SameSite=Lax` considers requests from `evil.yourdomain.com` to `app.yourdomain.com` as same-site, because the policy is scoped to the registrable domain, not the exact origin. If your organization has any subdomain that serves user-generated content, runs an older CMS, or is otherwise less locked-down than your main application, it's a launching pad for a CSRF attack against the properties that share its parent domain.

Older or less common browsers and embedded webviews inside mobile apps don't reliably enforce SameSite the way current desktop Chrome and Firefox do. If a meaningful share of your traffic comes through in-app browsers — common for products with heavy social media referral traffic — you can't assume the browser default is doing the protecting for everyone.

## Where the attack surface concentrates

State-changing GET requests are worth an audit regardless of SameSite. If any endpoint changes data in response to a GET — a "delete" link, a preference toggle wired to a simple anchor tag — it's vulnerable to a much wider range of forgery techniques, including some that don't depend on cookie behavior at all, like an `<img src>` tag pointing at the endpoint. This is worth fixing independent of CSRF: state changes belong behind POST, PUT, or DELETE.

APIs that accept both cookie-based and token-based authentication are a subtler case. If a request carrying only a cookie is treated as authenticated, an attacker doesn't need to know the user's bearer token to forge a request — the browser supplies the cookie for free. Requiring a custom header, like `X-Requested-With` or an explicit API token, for any request that should only come from your own JavaScript closes this gap, because cross-site form submissions can't set custom headers.

## The pragmatic baseline

For a typical application, the combination worth defaulting to is: `SameSite=Lax` on all auth cookies, a synchronizer token for any endpoint that's exposed to `SameSite=None` contexts or embedded consumption, and a hard rule that no state change ever happens on a GET request. If your app is a pure API consumed only by your own SPA over bearer tokens in an `Authorization` header rather than cookies, CSRF mostly doesn't apply to you — there's no ambient credential for a forged cross-site request to exploit. Know which of these categories your app falls into before deciding the threat doesn't apply; "we use cookies for something" is common enough that it's worth actually checking rather than assuming.
