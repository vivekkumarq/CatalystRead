---
title: "Shipping Spring Boot as a GraalVM Native Image"
slug: "graalvm-native-images-spring-boot"
description: "What actually changes when you compile Spring Boot to a GraalVM native image, and the reflection and initialization pitfalls that trip up the build."
publishedAt: "2025-11-03"
updatedAt: "2026-09-16"
category: "Spring Boot"
tags:
  - Spring Boot
  - GraalVM
  - Java
  - Performance
---

A GraalVM native image trades the JVM's warm-up cost and memory footprint for a much less forgiving compilation model: everything the application might do at runtime has to be knowable, mostly, at build time. Spring Boot 3's native support (built on Spring AOT and GraalVM's `native-image` tool) makes this practical for real applications, but it changes some assumptions that JVM developers don't normally have to think about.

## What the Trade-Off Actually Buys You

A native image starts in tens of milliseconds instead of the one-to-several seconds a typical Spring Boot JVM app takes, and it uses a fraction of the memory at idle because there's no JIT, no bytecode interpreter warming up, and no class metadata loaded speculatively. That matters enormously for serverless functions billed by execution time and for Kubernetes deployments doing frequent horizontal autoscaling, where JVM startup cost is paid on every scale-up event. It matters much less for a long-running service that stays up for days and benefits from the JIT eventually out-optimizing the ahead-of-time compiled native binary's steady-state throughput.

```bash
./mvnw -Pnative native:compile
```

```xml
<plugin>
    <groupId>org.graalvm.buildtools</groupId>
    <artifactId>native-maven-plugin</artifactId>
</plugin>
```

## Reflection Is the Recurring Problem

Native image compilation performs aggressive static analysis to figure out exactly which classes, methods, and fields the application can reach, and it strips everything else. Reflection defeats that analysis, because the reflective call target isn't visible at compile time — it's a string resolved at runtime. Spring's own components (bean creation, `@Autowired`, `@Transactional` proxies) are already handled by Spring AOT, which generates the necessary reflection hints automatically. The pain shows up in your own code and in third-party libraries that weren't written with native image in mind — Jackson mixins, custom `ObjectMapper` configuration touching classes only through reflection, JPA entities with unusual proxy behavior.

```java
@RegisterReflectionForBinding({OrderDto.class, LineItemDto.class})
@Configuration
public class NativeHints {
}
```

```java
@ImportRuntimeHints(OrderRuntimeHints.class)
@Configuration
public class OrderConfig {
}

class OrderRuntimeHints implements RuntimeHintsRegistrar {
    @Override
    public void registerHints(RuntimeHints hints, ClassLoader classLoader) {
        hints.reflection().registerType(LegacyPricingEngine.class,
                MemberCategory.INVOKE_DECLARED_CONSTRUCTORS,
                MemberCategory.INVOKE_DECLARED_METHODS);
    }
}
```

When a class is missing a reflection hint, the failure typically doesn't show up at build time — it shows up as a runtime exception in the compiled binary, which means the feedback loop for getting hints right is a full native compile (often several minutes) followed by running the actual binary. Testing with the native image test support (`./mvnw -PnativeTest test`) catches most of these before they reach a real deployment.

## What You Give Up

Static initialization in native images runs at *build time* by default for most classes, which is where a lot of the startup-time win comes from — but it means any static field that depends on runtime environment (a value read from an environment variable at class-load time, for instance) can bake in the build machine's value instead of the runtime environment's. Anything that genuinely needs runtime initialization has to be marked explicitly.

```java
@Bean
static NativeImageConfiguration nativeImageConfig() {
    return new NativeImageConfiguration(); // initialized at runtime, not build time
}
```

You also lose most runtime bytecode manipulation — some AOP proxying styles, certain dynamic class loading patterns, and libraries that generate classes on the fly at startup either don't work or need a native-image-specific code path. Before committing a service to native image, it's worth auditing its dependency list for anything doing dynamic class generation; that's a more reliable predictor of native image pain than the size of the codebase itself.

## A worked failure mode

A native image misses a reflective repository; it works on JVM tests and fails in prod. Build time is 15 minutes so nobody iterates. A security CVE requires a rebuild of the whole image with a forgotten reachability metadata file. The failure is native as a surprise runtime. Hint files tested in CI, a JVM fallback, and a rebuild pipeline.

## When this is the wrong tool

Native images are the wrong tool if startup is already 1s and you need heavy runtime reflection you will not hint. They complicate some agents. Use them for CLI/functions where startup and RSS matter and you will maintain metadata.

Treat the counterexample as part of the spec. Someone will apply "Shipping Spring Boot as a GraalVM Native Image" to a problem that only looks similar at the noun level—same words, different constraints. Require a one-page fit check: scale, consistency, failure domains, and who is on call. If two of those are guesses, run a spike, not a rewrite. The expensive bugs are not the ones in the happy-path tutorial; they are the ones where the tutorial's silent assumptions were load-bearing.
If a dry-run in staging with production-like volume does not reproduce the benefit, do not scale the idea on a hope and a dashboard. Ship the smaller version that you can revert in one deploy.
