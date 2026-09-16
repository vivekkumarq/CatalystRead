---
title: "Spring Authorization Server: An OAuth 2.1 Provider in Your JVM"
slug: "spring-authorization-server-oauth"
description: "Registered clients, authorization consent, token customization, and when to run SAS versus buying Okta, Keycloak, or Entra."
publishedAt: "2026-09-08"
category: "Spring Boot"
tags:
  - Spring Boot
  - OAuth
  - Spring Security
  - Identity
sources:
  - title: "Spring Authorization Server reference"
    publisher: "Spring"
    url: "https://docs.spring.io/spring-authorization-server/reference/"
  - title: "OAuth 2.1 draft"
    publisher: "IETF"
    url: "https://datatracker.ietf.org/doc/html/draft-ietf-oauth-v2-1"
---

Spring Authorization Server (SAS) is a Spring Security project that implements an **authorization server**: registered clients, authorization code with PKCE, refresh tokens, OIDC userinfo, and introspection. You already know the resource-server side (`spring-boot-starter-oauth2-resource-server`). SAS is the other half, for when the identity provider is **your** app, not a vendor tenant.

## What you must implement even when SAS is "just a starter"

A `RegisteredClientRepository` (JDBC in real deployments). A user store and an `AuthenticationProvider` for the login page. Consent if third-party clients exist. Token settings: access token TTL, rotation of refresh tokens, reuse detection. **Keys**: a `JWKSource` with rotation. If you sign JWTs with a key in `application.yml` committed to git, you have a souvenir, not a provider.

```java
RegisteredClient.withId("spa")
  .clientId("spa")
  .clientAuthenticationMethod(ClientAuthenticationMethod.NONE)
  .authorizationGrantType(AuthorizationGrantType.AUTHORIZATION_CODE)
  .redirectUri("https://app.example.com/callback")
  .postLogoutRedirectUri("https://app.example.com/")
  .scope(OidcScopes.OPENID)
  .clientSettings(ClientSettings.builder().requireProofKey(true).build())
  .build();
```

Public clients: `requireProofKey(true)`. Confidential clients: hashed secrets, not `{noop}`. Authorization code is the grant; password grant is gone for good reasons.

## Customization points

`OAuth2TokenCustomizer` adds claims (`tenant_id`, `roles`) that resource servers will trust. Do not stuff PII into JWTs you cannot revoke except by expiry. Prefer opaque tokens plus introspection if you need kill switches, at the cost of a round trip.

Session correlation between the login form and the OAuth dance is SAS plus Spring Security sessions. Horizontal scale needs session persistence (`Spring Session`) or a sticky login host. Multi-issuer setups need care with `iss` claims.

## When not to run SAS

If you need social login, passkeys, threat detection, and a compliance questionnaire tomorrow, a commercial IdP or Keycloak with a team is cheaper than a staff engineer reinventing recovery email. SAS shines for **first-party** microservices in a company that already runs Spring, wants GitOps for clients, and can own key rotation and availability of the authz box (it is a critical path).

Read the SAS how-to samples for JDBC and OIDC, then draw the failure mode when SAS is down: no logins, or cached tokens until TTL. That availability story is why identity is often bought. If you still build it, treat SAS like a payments service: multi-AZ, backups of registered clients, and a runbook for key compromise.
