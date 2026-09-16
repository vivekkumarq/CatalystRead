---
title: "Configuration Profiles and Externalized Config, Done Right"
slug: "spring-boot-configuration-profiles-externalized-config"
description: "A pragmatic approach to Spring profiles and externalized configuration that avoids property sprawl and keeps environment differences honest."
publishedAt: "2025-04-29"
updatedAt: "2026-09-16"
category: "Spring Boot"
tags:
  - Spring Boot
  - DevOps
  - Configuration
  - Backend Engineering
---

Every Spring Boot project starts with one `application.yml` and, within a year, tends to accumulate five profile-specific files, a handful of environment variables nobody documented, and at least one property that only works because of the order two config sources happen to load in. None of that is inevitable — Spring's configuration model is more disciplined than most teams end up using it.

## Layering, Not Duplicating

The instinct to copy the entire config file per environment and edit a few lines is the single biggest source of drift. Profile-specific files should contain only the values that actually differ; everything else stays in the base file and applies everywhere.

```yaml
# application.yml — shared defaults
spring:
  jpa:
    open-in-view: false
  jackson:
    default-property-inclusion: non_null

logging:
  level:
    root: INFO
```

```yaml
# application-prod.yml — only what changes
spring:
  datasource:
    url: ${DB_URL}
    hikari:
      maximum-pool-size: 20

logging:
  level:
    root: WARN
```

If a value is identical across every environment file, that's a signal it belongs in the base file, not a coincidence to leave alone.

## Precedence Is a Feature, Use It Deliberately

Spring Boot's property source precedence — command-line args, then environment variables, then profile-specific files, then the base file — exists so you can override without editing. The mistake teams make is fighting the order instead of using it: hardcoding an environment-specific value in a profile file when it should be an environment variable injected at deploy time.

```java
@ConfigurationProperties(prefix = "app.payments")
public record PaymentsProperties(
        String providerUrl,
        Duration timeout,
        int maxRetries) {
}
```

```yaml
app:
  payments:
    provider-url: ${PAYMENTS_PROVIDER_URL}
    timeout: 5s
    max-retries: 3
```

`@ConfigurationProperties` over scattered `@Value` injections gives you type-safe, validated, IDE-autocompletable configuration, and it fails fast at startup if a required property is missing rather than throwing a null pointer three requests into production traffic. Add `@Validated` with Bean Validation annotations on the record components for properties that have real constraints, like a positive retry count.

## Secrets Don't Belong in Any Profile File

Regardless of how carefully profiles are organized, actual secrets — database passwords, API keys, signing keys — should never sit in a committed YAML file, profile-specific or not, even encrypted-at-rest in the repo. Pull them from environment variables backed by a secrets manager (Vault, AWS Secrets Manager, Kubernetes Secrets) at deploy time:

```yaml
spring:
  datasource:
    password: ${DB_PASSWORD}
```

For local development, a `.env` file loaded outside of version control, or `application-local.yml` git-ignored entirely, keeps real credentials off of every developer's machine's git history without adding friction.

## Naming Profiles for What They Are

Resist naming profiles after infrastructure (`server1`, `blue`) when they should be named after purpose (`dev`, `staging`, `prod`, `test`). Infrastructure changes; the meaning of "production configuration" doesn't. It's also worth keeping a `default` profile lean and treating it as the safety net for local development and tests, not as a dumping ground — a `spring.profiles.active` that silently falls back to values nobody intended for production is a subtle way to ship the wrong connection pool size or logging level. Configuration should be boring enough that a new engineer can trace exactly which value wins for a given environment in under a minute; if that takes longer, the layering has gotten away from you.

## A worked example

`application.yml` has non-secrets. `application-prod.yml` has prod URLs. Secrets from env or a Secret manager via Spring Cloud / env vars. `@ConfigurationProperties(prefix = "billing")` with a record, validated on start. Profile `local` for developers. You never activate `prod` via a string in code.

A failing boot test: missing `BILLING_API_KEY` with `@Validated` properties.

## Failure modes

Profile-specific files that override each other mysteriously (`last wins`). Secrets in git. `@Value` spaghetti. YAML vs env relaxed binding surprises (`BILLING_API_URL` vs `billing.api-url`). Too many profiles (`prod-eu-canary-3`). Changing config without restart when the app is not built for it.

`spring.profiles.active` baked into the image.

## When this is the wrong tool

Feature flags are not Spring profiles. Do not use profiles for tenant customization at runtime. A 200-key yaml is a smell — split modules. Kubernetes ConfigMaps vs Spring Cloud Config: pick one source of truth. If the process must reconfigure live, you need a watch, not a profile. Skip XML `applicationContext` for new apps.

## A worked failure mode

`prod` secrets sit in `application-prod.yml` in git. Profile `dev` is active in prod because of an env typo. A relaxed binding maps the wrong property. The failure is profiles as secret stores. Use env/KMS, fail fast on missing props, and print the effective config at boot (redacted).

Profiles are the wrong tool for per-tenant config at scale. Do not compile secrets. Externalize and verify.

When this pattern is stretched past its assumptions, the first outage looks like a mysterious performance cliff instead of a design limit. "Configuration Profiles and Externalized Config, Done Right" fails that way when traffic mix, data shape, or team skill does not match the blog that sold the approach. Keep a kill switch: feature flag, smaller blast radius, or an older path that still works. Measure the thing the idea claims to improve, not a vanity graph. If you cannot name a workload where you would refuse to use it, you have not finished the design.
