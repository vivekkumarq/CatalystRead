---
title: "The Spring Security Filter Chain, From Request to SecurityContext"
slug: "spring-security-filter-chain-mental-model"
description: "How SecurityFilterChain is assembled, where UsernamePassword and JWT filters sit, and why 'it works in a test slice' still fails behind a gateway."
publishedAt: "2026-09-12"
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
