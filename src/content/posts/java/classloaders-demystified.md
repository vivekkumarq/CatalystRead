---
title: "ClassLoaders Demystified"
slug: "classloaders-demystified"
description: "ClassLoaders quietly decide how your code finds classes, why two copies of the same class can coexist, and why app servers leak metaspace."
publishedAt: "2025-04-09"
category: "Java"
tags:
  - Java
  - ClassLoaders
  - JVM
  - Application Servers
---

Most Java developers never think about class loading until something breaks in a way that doesn't make sense: a `ClassCastException` between two instances of what looks like the exact same class, or a `NoClassDefFoundError` for a class that's clearly on the classpath. Both symptoms trace back to the same mechanism — the class loader hierarchy — and understanding it turns these from mysteries into diagnosable problems.

## The Delegation Hierarchy

By default, the JVM loads classes through a chain of loaders, each delegating upward before trying to load anything itself:

- **Bootstrap class loader** — loads core JDK classes (`java.lang.*`, etc.), written in native code, has no parent.
- **Platform class loader** — loads other JDK modules.
- **Application (system) class loader** — loads classes from your application's classpath.

When your code asks for a class, the application loader first delegates to its parent, which delegates to *its* parent, all the way up to bootstrap. Only if none of the ancestors can find the class does the original loader actually try to load it itself. This parent-first model exists specifically to stop application code from shadowing core JDK classes — you can't accidentally define your own `java.lang.String` and have it used instead of the real one, because bootstrap always gets first refusal.

```java
public class LoaderInspector {
    public static void main(String[] args) {
        System.out.println(String.class.getClassLoader());   // null — loaded by bootstrap
        System.out.println(LoaderInspector.class.getClassLoader()); // app class loader
    }
}
```

## A Class Is Identified by Loader, Not Just Name

This is the part that causes real confusion: the JVM's notion of "the same class" is `(fully qualified name, defining class loader)`, not just the name. Two different class loaders can each load `com.example.Widget` from the same or different bytecode, and the JVM treats the results as two entirely unrelated types.

```java
Object widgetFromA = loaderA.loadClass("com.example.Widget").getDeclaredConstructor().newInstance();
Object widgetFromB = loaderB.loadClass("com.example.Widget").getDeclaredConstructor().newInstance();

// Throws ClassCastException even though the source is identical —
// they are different types as far as the JVM is concerned
Widget w = (Widget) widgetFromA;
```

This is exactly what happens in application servers and plugin systems that give each deployed application, or each plugin, its own class loader for isolation. It's a feature — it lets two web applications each bundle a different version of the same library without conflict — but it means passing objects between isolation boundaries needs to go through shared interfaces loaded by a common ancestor loader, never through the isolated implementation classes directly.

## Where Leaks Come From

Metaspace, where class metadata lives, is reclaimed only when a class's defining loader becomes unreachable *and* every class it loaded becomes unreachable too. In practice this means: if anything outside a custom class loader's scope still holds a reference to one of its loaded classes — a `ThreadLocal` that was never cleared, a static field in a shared class, a thread that outlives the deployment — the entire class loader, and every class and byte of metadata it loaded, stays pinned in memory.

| Common leak source | Why it holds the loader alive |
| --- | --- |
| Unremoved `ThreadLocal` values | Thread-local map entry references the object, which references its class, which references its loader |
| Threads started by the app, not stopped on shutdown | Thread's context class loader field |
| JDBC drivers registered but not deregistered | `DriverManager`'s static registry holds the driver instance |
| Static caches in shared/parent-loaded classes | Cache entry references a class from the child loader |

This is the classic "hot redeploy leaks metaspace" problem in application servers: every redeploy creates a new class loader, and if the old one can't be garbage collected because of one of the above, you accumulate loaders — and their entire class graphs — until `OutOfMemoryError: Metaspace`. A heap dump analyzer that can show retained class loaders (Eclipse MAT's "duplicate classes" and leak suspects reports are good starting points) is the fastest way to confirm this diagnosis.
