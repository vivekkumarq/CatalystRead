---
title: "Building Stateless JWT Authentication with Spring Security"
slug: "stateless-jwt-auth-spring-security"
description: "A working approach to stateless JWT authentication in Spring Security, covering filter placement, claims, and the token revocation problem it doesn't solve."
publishedAt: "2025-03-28"
category: "Spring Boot"
tags:
  - Spring Boot
  - Spring Security
  - Java
  - REST APIs
---

Stateless JWT auth is popular because it removes server-side session storage from the equation, which simplifies horizontal scaling and gets you out of the sticky-session business. It also introduces a set of problems session-based auth never had — token revocation chief among them — so it's worth building the mechanics correctly and being honest about the trade-off up front.

## Wiring the Filter Chain

The core idea is a custom filter that runs before Spring Security's built-in authentication filters, extracts a bearer token, validates it, and populates the `SecurityContext` if it checks out.

```java
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final JwtDecoder jwtDecoder;

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response,
                                     FilterChain chain) throws ServletException, IOException {
        String header = request.getHeader(HttpHeaders.AUTHORIZATION);
        if (header != null && header.startsWith("Bearer ")) {
            try {
                Jwt jwt = jwtDecoder.decode(header.substring(7));
                var authorities = jwt.getClaimAsStringList("roles").stream()
                        .map(SimpleGrantedAuthority::new)
                        .toList();
                var auth = new JwtAuthenticationToken(jwt, authorities);
                SecurityContextHolder.getContext().setAuthentication(auth);
            } catch (JwtException ex) {
                // Leave the context empty; downstream authorization will reject the request.
            }
        }
        chain.doFilter(request, response);
    }
}
```

Registering it correctly matters as much as writing it: it needs to run before `UsernamePasswordAuthenticationFilter`, and the security configuration needs to disable session creation entirely so nothing accidentally falls back to a session-backed context.

```java
@Bean
SecurityFilterChain filterChain(HttpSecurity http, JwtAuthenticationFilter jwtFilter) throws Exception {
    return http
        .csrf(CsrfConfigurer::disable)
        .sessionManagement(sm -> sm.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
        .authorizeHttpRequests(auth -> auth
            .requestMatchers("/api/auth/**").permitAll()
            .anyRequest().authenticated())
        .addFilterBefore(jwtFilter, UsernamePasswordAuthenticationFilter.class)
        .build();
}
```

If Spring Security's own OAuth2 resource server support fits your setup, `spring-boot-starter-oauth2-resource-server` with `.oauth2ResourceServer(oauth2 -> oauth2.jwt(...))` does most of this for you and is worth preferring over a hand-rolled filter unless you have a specific reason not to.

## Claims Worth Keeping Small

Resist the urge to stuff a full user profile into the token. Keep it to what authorization decisions actually need — subject, roles, tenant ID, expiry — and fetch anything else from a database or downstream service using the subject claim as the lookup key. Every byte in the JWT rides along on every request header, and a bloated token is a habit that's hard to walk back once clients depend on its shape.

```java
String token = Jwts.builder()
        .subject(user.getId().toString())
        .claim("roles", user.getRoles())
        .claim("tenant", user.getTenantId())
        .issuedAt(new Date())
        .expiration(Date.from(Instant.now().plus(15, ChronoUnit.MINUTES)))
        .signWith(signingKey)
        .compact();
```

## The Revocation Problem You Still Have to Solve

Statelessness cuts both ways: the server can't force-expire a token it never stored a reference to. If an account is compromised or a user is deactivated, a JWT issued five minutes ago remains valid until it naturally expires, regardless of what the database says. Three practical mitigations, usually combined:

- **Short access-token lifetimes** (5–15 minutes) paired with a refresh token, so the blast radius of a leaked access token is small.
- **A denylist** for the rare but real case of a token that must die immediately — store revoked token IDs (`jti` claim) in Redis with a TTL matching the token's remaining lifetime, and check it in the filter.
- **A `tokenVersion` claim** tied to the user record — bump it on password change or deactivation, and reject any token whose version doesn't match current state.

None of these bring back true statelessness, but they bound the damage without reintroducing a full session store, which is usually the actual goal behind choosing JWTs in the first place.
