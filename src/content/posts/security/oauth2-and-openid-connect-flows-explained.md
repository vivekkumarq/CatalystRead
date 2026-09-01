---
title: "OAuth 2.0 and OpenID Connect: Flows Explained for App Developers"
slug: "oauth2-and-openid-connect-flows-explained"
description: "A practical guide to OAuth 2.0 and OpenID Connect flows for application developers, covering authorization code with PKCE and why implicit flow is obsolete."
publishedAt: "2025-08-20"
category: "Security"
tags:
  - Security
  - Authentication
  - Web Development
  - Backend Engineering
---

OAuth 2.0 and OpenID Connect get conflated constantly, which causes real confusion about what a given integration actually provides. OAuth is an authorization framework — it lets an application access resources on a user's behalf without seeing their password. OpenID Connect is a thin identity layer built on top of OAuth that adds authentication — proving who the user is — via a standardized ID token. If your app only needs to know who logged in, you want OIDC. If it also needs to call an API on the user's behalf, you're using OAuth's access tokens too.

## Authorization code flow: the default for a reason

The authorization code flow is the right choice for nearly every application type today, including single-page apps, thanks to the PKCE extension. The flow, at a high level: the app redirects the user to the identity provider, the user authenticates there, the provider redirects back with a short-lived authorization code, and the app exchanges that code for tokens through a back-channel request the browser never sees.

The critical property is that the access token and ID token never pass through the browser's URL or history — only the one-time code does, and that code is useless without the corresponding PKCE verifier. PKCE (Proof Key for Code Exchange) adds a dynamically generated secret the app creates before the redirect and proves possession of during the token exchange, which closes the gap that used to let a malicious app intercept an authorization code meant for someone else and redeem it itself.

```
1. App generates code_verifier, derives code_challenge from it
2. App redirects user to /authorize with code_challenge
3. User authenticates; provider redirects back with a short-lived code
4. App exchanges code + code_verifier for tokens (back-channel, HTTPS)
5. Provider validates the verifier matches the original challenge
```

## Why implicit flow is deprecated

The implicit flow returned access tokens directly in the redirect URL fragment, skipping the code exchange step entirely. That made tokens visible in browser history, server logs of any proxy in the path, and referrer headers, with no way to bind the token to the specific client that requested it. Current OAuth guidance (RFC 9700, the OAuth 2.0 Security Best Current Practice) explicitly recommends against implicit flow for new applications. If you're maintaining an app that still uses it, migrating to authorization code with PKCE is worth prioritizing.

## Client credentials and refresh tokens

Machine-to-machine communication, where there's no user to authenticate, uses the client credentials flow: the app authenticates directly with its own client ID and secret and receives an access token scoped to itself. This only belongs in server-side contexts where a secret can be kept confidential — never in a mobile app or SPA, where the secret would be extractable from the client.

Refresh tokens let an app obtain new access tokens without re-prompting the user, and they deserve treatment as sensitive as passwords: store them server-side when possible, rotate them on use (issuing a new refresh token each time and invalidating the old one), and set a firm absolute expiry so a leaked refresh token doesn't grant indefinite access.

## Validating what comes back

An access token's job is authorization to an API; treat it as opaque unless you control the API and know its format. An ID token's job is authentication, and it must be validated properly before trusting anything in it: verify the signature against the provider's published keys, check the issuer and audience claims match your app, and confirm the token hasn't expired. Skipping signature validation — trusting a decoded token's claims without verifying who signed it — is one of the most common and most serious implementation mistakes in OIDC integrations, because it means anyone who can construct a token with the right shape can impersonate any user.
