---
title: "CSP Nonces versus Hashes: Shipping a Policy That Survives a Real Frontend Build"
slug: "content-security-policy-nonce-vs-hash"
description: "How to ban unsafe-inline without breaking React and Angular, when hashes beat nonces, and the report-only rollout that does not brick production."
publishedAt: "2026-09-09"
category: "Security"
tags:
  - Security
  - CSP
  - XSS
  - Web Development
sources:
  - title: "Content Security Policy Level 3"
    publisher: "W3C"
    url: "https://www.w3.org/TR/CSP3/"
---

`script-src 'unsafe-inline'` makes CSP decorative. A XSS hole that injects `<script>` still runs. The two honest ways off that list are **nonces** (a per-response random value on every trusted `<script>` tag) and **hashes** (sha256 of the exact inline source). Both require the HTML generator and the policy header to agree.

## Nonces fit SSR and CDNs that can vary HTML

Generate `nonce = CSPRNG`, put it on each script the framework emits, send `Content-Security-Policy: script-src 'nonce-....' 'strict-dynamic'` (or a tighter set). `'strict-dynamic'` lets a nonced script load children — useful for bundlers — and is also easy to misunderstand: a compromised nonced bundle can still load more JS. Nonces are not a substitute for supply-chain hygiene.

The nonce must change every response. A static nonce in `index.html` on a CDN is a public allowlist.

## Hashes fit truly static inline snippets

```html
<script>window.__CONFIG__={api:"/api"}</script>
```

Hash that exact bytes (whitespace included). If your build injects a build id into the snippet, the hash changes and the policy must change with it. That pairing is why hashes are painful for SPA shells that rewrite HTML often, and fine for a tiny bootloader you control.

## Report-only, then enforce

Start with `Content-Security-Policy-Report-Only` and a reporting endpoint (or `report-to`). Fix the violations that are your own Google Tag Manager and webpack runtime, not just the ones that look like attacks. `unsafe-eval` often appears because of a library using `new Function`. Either replace the library or accept a narrower exception with a comment and an expiry.

`style-src` is its own war (CSS-in-JS inline styles). Many teams ship strict `script-src` first and leave styles looser until they can nonce style tags. That is a reasonable sequence if XSS via script is the actual threat model.

CSP is a second line after encoding and sanitization. It exists for the day a template forgets to escape. If you cannot rotate a nonce or recompute a hash in CI, you are not ready to enforce; stay on report-only until the pipeline can.
