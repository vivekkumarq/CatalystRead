---
title: "The Spring Security Filter Chain, From Request to SecurityContext"
slug: "spring-security-filter-chain-mental-model"
description: "How SecurityFilterChain is assembled, where UsernamePassword and JWT filters sit, and why 'it works in a test slice' still fails behind a gateway."
publishedAt: "2026-09-12"
updatedAt: "2026-09-16"
category: "Spring Boot"
tags:
  - Spring Boot
  - Spring Security
  - Authentication
  - Java
---

Spring Security is a servlet filter chain that either populates `SecurityContext` or rejects the request. Annotations like `@PreAuthorize` run later, in method security, and they assume the context is already set. If you do not know which filter runs, you will add a second JWT parser, disable CSRF "to make the SPA work," and still not know why actuator is public.

## The chain is a list, in order

`SecurityFilterChain` is beans of `Filter` with a request matcher. A typical API chain:

1. `DisableEncodeUrlFilter`, `WebAsyncManagerIntegrationFilter`
2. `SecurityContextHolderFilter` (loads context from the repository — session or none)
3. `HeaderWriterFilter`, `CorsFilter`, `CsrfFilter`
4. `LogoutFilter`
5. Authentication filters (`BearerTokenAuthenticationFilter`, form login, etc.)
6. `AuthorizationFilter` (the replacement for the old `FilterSecurityInterceptor`)

A request matches **one** chain (first match wins in older setups; use `securityMatcher` so actuator and API do not share rules by accident).

```java
@Bean
SecurityFilterChain api(HttpSecurity http) throws Exception {
  http.securityMatcher("/api/**")
      .csrf(csrf -> csrf.disable()) // APIs using Bearer, not cookie session
      .sessionManagement(s -> s.sessionCreationPolicy(STATELESS))
      .oauth2ResourceServer(o -> o.jwt(Customizer.withDefaults()))
      .authorizeHttpRequests(a -> a
          .requestMatchers("/api/public/**").permitAll()
          .anyRequest().authenticated());
  return http.build();
}
```

Disabling CSRF is correct for a Bearer API and wrong for a cookie-session MVC app. Copying the API snippet into a Thymeleaf form app is a vulnerability, not a simplification.

## Where JWT actually gets validated

The resource-server filter extracts the bearer token, the `JwtDecoder` checks signature and `exp`, converters map claims to `JwtAuthenticationToken`. If your gateway already validated the token and you re-validate with a different JWK set, you will see intermittent 401s after key rotation. Pick one authority.

Anonymous authentication is a real `Authentication` object. `anonymous()` vs `permitAll()` vs `authenticated()` are not synonyms. Health checks often want `permitAll`; "user not logged in" pages want anonymous.

## Debugging

Set logging for `org.springframework.security` to DEBUG in a **non-prod** clone and watch which filter failed. `SecurityContextHolder.getContext()` in a `@Async` method is empty unless you propagate the context — that is not a filter bug.

If a `@WebMvcTest` passes and the full app 401s, the test likely did not use the same `SecurityFilterChain` or used `@WithMockUser` while production expects a real JWT. Tests should hit the matcher you think production hits.

## A worked example

You expose `/api/**` as JWT and `/actuator/health` as public, with a second chain for a small admin UI that uses form login and CSRF. Two beans, two `securityMatcher`s. A request to `/api/orders` never hits the form-login filters. A test with `MockMvc` and `httpBasic` against `/api` fails for the right reason: that chain does not enable HTTP Basic.

```java
.mockMvc.perform(get("/api/orders")
    .header("Authorization", "Bearer " + token))
    .andExpect(status().isOk());
```

Generate the token from the same `JwtDecoder` as production, or use `jwt()` request post-processors that match claim names your converter expects (`sub`, `roles`).

## Failure modes

`anyRequest().authenticated()` on a chain that also matches static assets blocks CSS after a "secure by default" copy-paste. CSRF disabled on a cookie session SPA is a classic hole. Multiple `SecurityFilterChain` beans without matchers collide; one wins unpredictably. `SecurityContext` in `CompletableFuture.supplyAsync` is empty, so `@PreAuthorize` on an async worker does nothing useful — or uses the wrong thread's context if you reuse threads.

A custom filter inserted with `addFilterBefore` in the wrong place runs before the JWT is parsed and always sees anonymous.

## When this is the wrong tool

Spring Security's filter chain is the wrong place to implement business "can this user see order 12?" beyond role/authority checks — that is domain authorization in the service. Do not use it as an API gateway (rate limits, WAF, mTLS termination belong at the edge). If the app is a batch job with no HTTP, you do not need a filter chain; use method security or nothing. Copying OAuth2 login into a machine-to-machine client is the wrong tool: use client credentials, not a browser filter chain.

## Review checklist

- Each chain has a `securityMatcher`; actuator is not accidentally on the API chain.
- CSRF matches the session story (on for cookies, off for Bearer-only).
- JWT is validated in one place (gateway *or* resource server JWK set).
- Slice tests hit the same matcher and token shape as production.

## A worked failure mode

A custom filter is added after `AuthorizationFilter` and never sees anonymous requests as expected. `permitAll` on `/api/**` is overridden by a later stricter chain that is not hit because the first chain matched. CSRF is off for a cookie session. The failure is filter order folklore. Draw the chain, one matcher per chain, tests with `httpSecurity`.

Security filter lore is the wrong tool if you can use oauth2Login defaults. Do not add filters to hide a misconfigured matcher. Understand order when you customize.

A second, quieter failure is operational: the idea is copied from a talk into a path that has no rollback, no owner, and no metric that would show the invariant breaking. For "The Spring Security Filter Chain, From Request to SecurityContext", that usually means a Friday deploy with production as the first realistic test. Write down the user-visible symptom, the invariant, and the revert before you scale the pattern. If revert is a data rewrite, you do not have a revert—you have a project. Practice the failure in staging with production-sized data at least once, or you will practice it on customers.
