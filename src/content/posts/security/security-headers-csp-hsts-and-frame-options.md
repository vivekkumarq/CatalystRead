---
title: "Security Headers: CSP, HSTS, and Frame Options, and What Each Stops"
slug: "security-headers-csp-hsts-and-frame-options"
description: "A practical walkthrough of the HTTP security headers that matter most, what specific attack each one mitigates, and how to roll them out without breaking your site."
publishedAt: "2025-12-17"
category: "Security"
tags:
  - Security
  - Web Development
  - Application Security
  - Browser Security
---

Security headers are one of the highest-leverage defenses available because they cost nothing to add beyond configuration and shift real work onto the browser, which enforces them for every request without any application-level code. Most sites ship with a handful missing not because the trade-offs are hard, but because nobody sat down and worked through what each one actually does.

## Content-Security-Policy

CSP tells the browser which sources are allowed to supply scripts, styles, images, and other resources on a page, and it's the single strongest defense against cross-site scripting reaching a dangerous outcome even when an injection point exists elsewhere in the app. If an attacker manages to inject a script tag pointing at an external domain, a well-configured CSP simply refuses to load or execute it, because that domain isn't on the allowlist.

```
Content-Security-Policy: default-src 'self'; script-src 'self' https://cdn.example.com; object-src 'none'; base-uri 'self'
```

The rollout trap is deploying a strict policy directly to production and breaking the site, because most real applications have scripts and styles from more sources than anyone initially remembers. Use `Content-Security-Policy-Report-Only` first, which logs violations without blocking anything, review the reports, refine the policy, and only then switch to enforcing mode. Avoid `unsafe-inline` and `unsafe-eval` in the final policy wherever possible — they defeat much of CSP's protection — and prefer nonces or hashes for any inline scripts you genuinely can't externalize.

## Strict-Transport-Security (HSTS)

HSTS tells the browser to never attempt a plain HTTP connection to your domain again for the specified duration, converting any future HTTP request to HTTPS automatically before it ever leaves the browser. This closes the window an attacker exploits by intercepting a user's very first HTTP request — before any redirect to HTTPS has happened — to serve a spoofed page or strip encryption from the session.

```
Strict-Transport-Security: max-age=63072000; includeSubDomains; preload
```

Roll out `max-age` gradually, starting short and increasing it as you confirm every subdomain genuinely supports HTTPS, since `includeSubDomains` applies the policy to everything under your domain and a subdomain still on plain HTTP becomes unreachable until it's fixed. The `preload` directive submits your domain to a list baked into browsers themselves, which protects even a user's very first visit, but it's effectively permanent — removal from the preload list takes months to propagate — so only add it once you're confident HTTPS is fully and durably in place everywhere.

## X-Frame-Options and frame-ancestors

X-Frame-Options prevents your pages from being loaded inside an iframe on another site, which is the core defense against clickjacking — an attack where a malicious site overlays invisible framed content from your site under deceptive UI, tricking users into clicking buttons or submitting forms they never intended to interact with.

```
X-Frame-Options: DENY
Content-Security-Policy: frame-ancestors 'none'
```

CSP's `frame-ancestors` directive is the modern replacement and supports finer-grained control, like allowing specific trusted origins to frame a page while blocking everyone else — useful for embeddable widgets that are meant to run inside partner sites. Setting both together maintains protection for the small number of older browsers that don't support `frame-ancestors`.

## A few more worth the five minutes

`X-Content-Type-Options: nosniff` stops browsers from guessing a response's content type based on its content rather than its declared `Content-Type`, which closes a path attackers used to get a browser to execute a file as script when the server intended it as plain data. `Referrer-Policy: strict-origin-when-cross-origin` limits how much of your URLs — including potentially sensitive query parameters — leak to third-party sites via the referrer header. None of these headers require application changes, and together they close off entire categories of attack that no amount of careful application code fully replaces.
