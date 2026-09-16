---
title: "CSP Nonces versus Hashes: Shipping a Policy That Survives a Real Frontend Build"
slug: "content-security-policy-nonce-vs-hash"
description: "How to ban unsafe-inline without breaking React and Angular, when hashes beat nonces, and the report-only rollout that does not brick production."
publishedAt: "2026-09-09"
updatedAt: "2026-09-16"
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

## When hashes beat nonces (and the reverse)

Use **hashes** when the inline script is a closed set: a JSON config blob, a tiny bootloader, email-template HTML you generate in CI. The policy can live in a static header. Any whitespace change in the snippet is a break, which is also the safety property.

Use **nonces** when the HTML is assembled per request (SSR, user-specific boot data) or when the set of inline tags is not known at build time. The CDN must then vary HTML and the CSP header together. Edge workers that inject a nonce into both the header and every `<script>` are the usual pattern; a cached HTML file with a stale nonce in the tag and a new nonce in the header is a white-screen.

`'strict-dynamic'` plus a nonce is the pragmatic SPA compromise: you nonce the one bundler entry and let it load chunks. You still need `script-src` to exclude hosts you do not trust. A compromised npm package inside the bundle is in-policy. CSP does not replace lockfiles and review.

## Failure modes

**Static nonce in `index.html`.** Once the file is public, attackers put that nonce on their injected tag. Rotate per response or do not call it a nonce.

**`unsafe-inline` plus a nonce.** In CSP2, a nonce *disables* unsafe-inline for scripts in supporting browsers; in mixed old policies the combination is easy to get wrong. Prefer nonce *or* hash, and drop unsafe-inline in enforce mode.

**Report endpoint as an XSS sink.** If your report URI reflects the violated URI into a dashboard without encoding, you built a second XSS. Treat reports as untrusted.

**GTM and `eval`.** Tag managers often need `unsafe-eval` or extra hosts. Isolate marketing tags behind a subdomain and a looser policy if product JS must stay strict — or accept that marketing JS is in the product threat model.

## Operational rollout

1. Report-only for two weeks on a canary host.
2. Classify violations: first-party runtime, third-party, actual probes.
3. Enforce on a small percentage, watch error rates and support tickets (“blank page”).
4. Keep a documented escape: a header flag or config to revert to report-only without a full deploy if a release ships a new inline.

## Review checklist

- Every trusted inline script has a matching nonce or hash; no static nonce on a CDN HTML file.
- Pipeline can recompute hashes when the boot snippet changes.
- `style-src` is an explicit decision, not an accident of copying `script-src`.
- Enforce is behind a rollout switch, not a Friday README change.
