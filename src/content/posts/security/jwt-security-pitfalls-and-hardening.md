---
title: "JWT Security Pitfalls and Hardening"
slug: "jwt-security-pitfalls-and-hardening"
description: "JSON Web Tokens are easy to misuse in ways that look correct in a demo and fail catastrophically in production — a walkthrough of the common mistakes."
publishedAt: "2024-11-15"
updatedAt: "2026-09-16"
category: "Security"
tags:
  - Security
  - JWT
  - Authentication
  - Web Security
---

JWTs are one of the easiest primitives in application security to implement wrong while still watching everything work. A token gets issued, a token gets verified, a login flow succeeds in a demo — and none of that tells you whether the implementation actually resists tampering. Because a JWT is just base64-encoded JSON with a signature bolted on, most of the danger comes from treating the signature as decorative rather than load-bearing.

## The algorithm confusion attack

The most well-known JWT vulnerability exploits libraries that trust the `alg` field inside the token itself to decide how to verify it. If a server is configured to accept a token signed with RS256 (asymmetric, verified with a public key) but naively honors whatever algorithm the token claims, an attacker can craft a token with `alg: HS256` and sign it using the server's own public key as an HMAC secret — because public keys are, by definition, public.

```javascript
// Vulnerable: trusts the algorithm from the token itself
jwt.verify(token, publicKey);

// Hardened: pins the expected algorithm explicitly
jwt.verify(token, publicKey, { algorithms: ["RS256"] });
```

Every major JWT library now supports pinning the accepted algorithm list explicitly, and it should be treated as non-negotiable configuration, not an optional hardening step. If your verification call doesn't specify `algorithms`, assume it's accepting more than you intend.

## Expiration and revocation

JWTs are stateless by design, which is exactly what makes revocation awkward. A token issued at login is valid until its `exp` claim says otherwise, regardless of what happens to the user's account in the meantime. If a user is deactivated, changes their password, or has their session forcibly logged out, a long-lived JWT issued before that event keeps working right up until it expires on its own schedule.

The practical fix is to keep access tokens short-lived — minutes, not days — and pair them with a refresh token that's checked against a server-side store on each use. That reintroduces some statefulness, but only at the refresh boundary, which is a reasonable trade: you get the performance benefit of stateless verification for most requests, while retaining the ability to kill a compromised session by invalidating its refresh token.

## Storage and payload hygiene

Where the token lives on the client matters as much as how it's signed. Storing a JWT in `localStorage` makes it readable by any JavaScript running on the page, which means a single XSS vulnerability anywhere in your application turns into full session theft. An `httpOnly` cookie isn't readable by JavaScript at all, which removes that specific exposure — though it reopens the CSRF conversation, so it needs to be paired with `SameSite` and, where relevant, a CSRF token.

The payload itself is worth a second look too. A JWT is signed, not encrypted — anyone who intercepts or is handed the token can decode and read every claim inside it without knowing the secret. Treating it as a safe place to stash a user's email, role, or internal ID is a common but avoidable habit; nothing in the payload should be information you'd be uncomfortable showing in a browser's dev tools, because that's exactly where it's visible.

Finally, verify the issuer and audience claims, not just the signature. A token that's validly signed by your own auth provider but was actually issued for a different application or environment should still be rejected if your service doesn't check `iss` and `aud` — otherwise a token meant for a staging environment can be replayed against production, or a token meant for one internal service can be reused against another that happens to trust the same signing key.

## A worked failure mode

`alg=none` is accepted; or `HS256` with a public RSA key as the HMAC secret (key confusion). Tokens live forever in localStorage. `kid` is taken from the attacker and fetches a jku. The failure is a JWT library with default-insecure verify. Pin algorithms, pin keys, short TTL, rotate, store refresh httpOnly, and never take alg from the token.

## When this is the wrong tool

JWTs are the wrong session for a same-site app that could use a server session. They are the wrong place to stuff PII. Do not use them if you cannot revoke. Prefer opaque tokens when you have a store.

The wrong-tool test is easier with a concrete customer. If a user can lose money, lose access, or see someone else's data when "JWT Security Pitfalls and Hardening" is slightly misapplied, do not let the pattern ride on defaults. Tighten the API, add an assertion in CI, and refuse silent fallbacks that look like success. Most production failures here are not exotic; they are a missing bound, a missing key, or a missing check that the original paper assumed a careful operator would have.
