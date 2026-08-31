---
title: "The Actuator Endpoints Worth Exposing (and How to Lock Them Down)"
slug: "spring-boot-actuator-endpoints-worth-exposing"
description: "Which Spring Boot Actuator endpoints earn their place in production, and the security configuration that keeps them from becoming an attack surface."
publishedAt: "2025-04-15"
category: "Spring Boot"
tags:
  - Spring Boot
  - DevOps
  - Spring Security
  - Observability
---

Actuator ships with over a dozen endpoints, and the default answer to "which should we expose" is not "all of them" and not "none of them" — it's a short, deliberate list, each one behind its own access decision. Getting this wrong in either direction is common: teams either expose `/actuator/env` to the internet and leak configuration secrets, or lock everything down so hard that on-call has no visibility during an incident.

## Start From an Empty Allowlist

The safest default is to expose nothing by web and opt in explicitly, rather than starting from `*` and trying to remember what to remove.

```yaml
management:
  endpoints:
    web:
      exposure:
        include: health,info,metrics,prometheus
  endpoint:
    health:
      show-details: when-authorized
      probes:
        enabled: true
```

`health` and `info` are close to mandatory — load balancers and orchestrators need `health` for liveness and readiness checks, and `info` is a cheap way to surface build metadata (git commit, version) without shipping a separate endpoint for it. `metrics` and `prometheus` (from `micrometer-registry-prometheus`) are what your monitoring stack scrapes and are safe to expose on an internal network, though still worth authenticating.

## The Ones That Need a Second Look

A few endpoints are genuinely useful but leak information that shouldn't reach unauthenticated callers:

- **`env`** dumps every property source, including anything that made it into `Environment` without being masked — database URLs, and occasionally credentials if someone didn't use a secrets manager correctly. Spring Boot sanitizes well-known sensitive key names by default, but that sanitization is a denylist, not a guarantee.
- **`heapdump`** hands out a full heap dump on request, which can contain session tokens, decrypted request bodies sitting in memory, or anything else your application happened to be holding. Treat it like a credential.
- **`threaddump`** and **`loggers`** are safe from an information-leak standpoint but let a caller change log levels at runtime (`loggers`) — genuinely useful for debugging a live incident, genuinely dangerous if anyone can flip your production logging to `TRACE` and watch request bodies scroll past.
- **`shutdown`** is disabled by default for good reason and should stay that way outside of tightly controlled environments like a container orchestrator's own lifecycle hooks.

## Securing What You Do Expose

Actuator endpoints should sit behind their own authorization rule, separate from your application's API security, ideally on a different port so network-level controls can do part of the job.

```yaml
management:
  server:
    port: 9001
```

```java
@Bean
SecurityFilterChain actuatorSecurityChain(HttpSecurity http) throws Exception {
    return http
        .securityMatcher(EndpointRequest.toAnyEndpoint())
        .authorizeHttpRequests(auth -> auth
            .requestMatchers(EndpointRequest.to("health", "info")).permitAll()
            .anyRequest().hasRole("OPS"))
        .httpBasic(Customizer.withDefaults())
        .build();
}
```

Running actuator on a separate port means it never needs to be reachable through your public load balancer at all — a security group or ingress rule can restrict it to your VPC, which is a stronger guarantee than any application-level check.

## A Reasonable Default Posture

For most services: expose `health` (with liveness/readiness probes for Kubernetes) and `info` publicly or near-publicly, put `metrics` and `prometheus` behind network-level restriction to your monitoring infrastructure, and require authenticated operator access for everything else — `env`, `loggers`, `threaddump`, `mappings`, `beans`. Never expose `heapdump` or `shutdown` outside a locked-down operator boundary. The goal isn't zero exposure; it's making sure every exposed endpoint was a decision, not a default nobody revisited.
