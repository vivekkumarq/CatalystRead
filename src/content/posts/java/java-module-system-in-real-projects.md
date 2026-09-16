---
title: "The Java Module System in Real Projects"
slug: "java-module-system-in-real-projects"
description: "JPMS is easy to dismiss after a rough first encounter, but used selectively it solves real encapsulation problems the classpath never could."
publishedAt: "2025-06-21"
updatedAt: "2026-09-16"
category: "Java"
tags:
  - Java
  - JPMS
  - Modules
  - Architecture
---

The Java Platform Module System, delivered in Java 9, has a reputation problem: most developers' first contact with it was an `IllegalAccessException` from a library doing reflection into JDK internals, or a build that suddenly failed after an upgrade. That rocky introduction obscures what JPMS is actually good at — real, enforced encapsulation between components, something the classpath never provided at all.

## The Problem JPMS Solves

Before modules, "public" meant public to the entire application, forever. Any class on the classpath could reach into any other class's public API, regardless of whether that API was meant for internal use within a library or genuinely part of its contract. `public` was the only privacy boundary bigger than "package", and packages themselves offered no real protection either — anyone could add a class to the same package name and get package-private access, a trick reflection-heavy frameworks used constantly.

```java
// module-info.java
module com.example.billing {
    requires java.sql;
    requires com.example.billing.api;

    exports com.example.billing.service;
    // com.example.billing.internal is NOT exported —
    // genuinely inaccessible outside this module, not just discouraged
}
```

With this declaration, `com.example.billing.internal` is invisible to every other module, even via reflection, unless the module explicitly `opens` that package. This is a real compiler- and runtime-enforced boundary, not a naming convention or a code review rule.

## Where It Pays Off

**Large, multi-team codebases.** When a monorepo has a dozen internal libraries maintained by different teams, JPMS makes "this package is an implementation detail" an enforceable statement instead of a comment. A team can refactor internal classes freely, knowing nothing outside the module could have compiled against them in the first place.

**Building smaller runtime images.** `jlink` can assemble a custom runtime image containing only the JDK modules your application actually uses, which matters for container image size and startup time.

```
jlink --module-path $JAVA_HOME/jmods:mods \
      --add-modules com.example.billing \
      --output custom-runtime
```

**Reliable configuration.** Module dependencies are checked at startup, not discovered at runtime as a `ClassNotFoundException` three requests into production traffic. A missing `requires` fails immediately and clearly, before the application even starts serving.

## Where It Costs More Than It's Worth

| Situation | JPMS fit |
| --- | --- |
| Single-team application, moderate size | Usually not worth the migration cost |
| Heavy use of reflection-based frameworks (older Hibernate, Spring configs) | Friction from `opens` requirements |
| Library meant for broad consumption | Classpath and module path compatibility both need consideration |
| Clear internal library boundaries, multiple teams | Strong fit |

Most Spring Boot and similar framework-heavy applications still run on the classpath rather than the module path, specifically because those frameworks rely on reflection into application classes for dependency injection and proxying, which requires explicit `opens` declarations that add ceremony without adding safety in a typical CRUD service.

## A Practical Adoption Path

You don't need to modularize everything to get value. A common, lower-risk pattern: keep the application itself unmodularized (running on the classpath, as an "unnamed module"), but modularize a handful of internal libraries with real encapsulation needs — a shared internal utility library, a core domain model — where hiding implementation packages from the rest of the org actually matters.

```java
module com.example.core.domain {
    exports com.example.core.domain.model;
    exports com.example.core.domain.event;
    // pricing.internal, validation.internal stay hidden
}
```

Modules on the module path can still be consumed by code on the classpath, so this hybrid setup works without forcing every consumer to modularize in lockstep. Treat JPMS as a targeted tool for enforcing boundaries that already exist conceptually in your architecture, not as an all-or-nothing migration for the whole codebase.

## A worked failure mode

A library splits into 20 JPMS modules and `exports` nothing useful; users fall back to `--add-opens` in every launcher. Spring Boot's loader and JPMS fight; tests need a different module graph than prod. The failure is modularity as paperwork. If you are not enforcing `opens` for reflection-heavy frameworks, a fat jar with a clear package API is enough. Use `module-info` when you can name the surface and test the launchers you ship.

## When this is the wrong tool

JPMS is the wrong tool to fix cyclic spaghetti by renaming folders. It is painful with many reflection frameworks. Do not modularize a weekend app. Adopt modules when you need strong encapsulation and will maintain launch scripts.

A worked anti-pattern: the team ships the architecture, then staffs it like a toy. "The Java Module System in Real Projects" needs boring operations—backups, timeouts, ownership, and a budget for the tax the idea always charges (compaction, replay, dual writes, extra latency, extra types). Unstaffed taxes come due at 2am. Put the tax in the design doc's cost section. If leadership wants the benefit without the tax, the honest answer is a smaller idea, not a heroic on-call rotation.
