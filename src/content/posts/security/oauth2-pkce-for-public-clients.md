---
title: "OAuth 2.0 PKCE for Public Clients: The Code Verifier Is the Secret"
slug: "oauth2-pkce-for-public-clients"
description: "RFC 7636: why native and SPA clients must use authorization code plus PKCE, and how a stolen redirect code becomes useless without the verifier."
publishedAt: "2026-08-20"
category: "Security"
tags:
  - Security
  - OAuth
  - PKCE
  - Authentication
sources:
  - title: "RFC 7636: Proof Key for Code Exchange by OAuth Public Clients"
    author: "N. Sakimura, J. Bradley, N. Agarwal"
    publisher: "IETF"
    url: "https://www.rfc-editor.org/rfc/rfc7636"
  - title: "OAuth 2.0 for Browser-Based Apps"
    publisher: "IETF OAuth Working Group"
    url: "https://datatracker.ietf.org/doc/html/draft-ietf-oauth-browser-based-apps"
---

A **public client** cannot keep a client secret. Anything in a mobile app binary or a JavaScript bundle is extractable. The old workaround, implicit flow, put access tokens in URL fragments and hoped interceptors would not look. **PKCE** (RFC 7636) keeps the **authorization code** flow — tokens come from a token endpoint POST — and adds a per-login secret the client generates in memory: the `code_verifier`.

## Challenge at authorize, verifier at token

Before redirecting to the authorization server, the client creates a high-entropy `code_verifier`, hashes it (S256) to `code_challenge`, and sends the challenge on `/authorize`. The authorization server stores the challenge with the eventual code. When the client redeems the code, it must send the raw verifier. If an attacker steals the code from a redirect (`myapp://callback?code=…` or a localhost redirect), they cannot redeem it without the verifier, which never left the honest app's memory.

```text
verifier = random(32+ bytes)
challenge = BASE64URL(SHA256(verifier))
/authorize?response_type=code&code_challenge=...&code_challenge_method=S256
/token { code, code_verifier }
```

Authorization servers should **require** PKCE for public clients and reject `code_challenge_method=plain` except for legacy. Confidential clients (server-side apps) should still use PKCE: it binds the code to the browser session that started the login and mitigates some mix-up and injection attacks when combined with current OAuth BCP.

## Redirect URIs are still load-bearing

PKCE does not fix an open redirect. If `redirect_uri` can be steered to an attacker page, the attacker gets the code **and** if they also tricked the user into using the attacker's verifier, the game is different — but the usual theft is a leaked code on a hijacked URI scheme. Register exact redirect URIs. On mobile, use claimed HTTPS URLs (App Links / Universal Links) rather than custom schemes when you can. On SPAs, follow the current browser-based apps draft: a backend-for-frontend or a worker that holds tokens beats dumping access tokens in `localStorage` if you have that option.

Do not mix PKCE with implicit (`response_type=token`). Do not send the verifier on the authorize request. Do not reuse verifiers across logins.

## Refresh tokens for public clients

If you issue refresh tokens to SPAs or mobile apps, they need additional sender constraints (rotation, family IDs, DPoP or mTLS where applicable). PKCE protects the **code**; it does not make a stolen refresh token safe. Treat token storage as a separate design.

If your library still defaults to implicit "because SPA," upgrade it. RFC 7636 is from 2015; continuing without PKCE is a known-bad pattern, not a style choice.

Read RFC 7636's attack description (the intercepted code). Then inspect your authorize URL in the browser network panel and confirm `code_challenge` is present and that the token call includes `code_verifier`. That is the whole control.
