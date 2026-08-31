---
title: "String Internals: Pooling, Compact Strings, and Concatenation"
slug: "string-internals-pooling-compact-strings-concatenation"
description: "Strings look like the simplest type in Java, but the string pool, compact string encoding, and concatenation strategy all affect memory and speed directly."
publishedAt: "2025-07-30"
category: "Java"
tags:
  - Java
  - Strings
  - JVM
  - Performance
---

`String` is the type every Java developer uses without thinking twice, which is exactly why its internals are worth understanding — small, unexamined assumptions about how strings are stored and compared tend to show up as real memory and CPU costs once an application is handling millions of them.

## The String Pool and `intern()`

String literals are automatically interned — the JVM maintains a pool of unique string instances, and any two identical literals refer to the exact same object.

```java
String a = "order-status";
String b = "order-status";
System.out.println(a == b); // true — same pooled instance

String c = new String("order-status");
System.out.println(a == c); // false — new String() always allocates fresh
```

This is precisely why `==` on strings is a classic bug: it works by accident for literals and breaks for anything constructed at runtime — from user input, deserialization, or `substring`. `equals()` is the only correct comparison; `==` should be reserved for the rare case where you deliberately need reference identity, not value equality.

`String.intern()` lets you manually add a runtime-constructed string to the pool, which can be a genuine memory optimization when you're holding millions of strings with heavy duplication — parsing a large file with a small set of repeated field values, for instance:

```java
String category = parseCategory(line).intern();
```

Used carelessly, though, `intern()` just moves memory pressure into the pool instead of the heap and can itself become a bottleneck under high call volume, since the pool needs synchronized-style coordination. It's a targeted tool for confirmed high-duplication scenarios, not a default habit.

## Compact Strings

Since JDK 9, `String` no longer always stores its content as a `char[]` (2 bytes per character). Instead, it uses a `byte[]` with a coder flag, storing content as Latin-1 (1 byte per character) whenever every character fits, and falling back to UTF-16 (2 bytes) only when it doesn't.

```java
String ascii = "order-42";     // stored as Latin-1: 1 byte/char internally
String mixed = "café-42";      // contains a non-Latin-1 char: stored as UTF-16
```

For the overwhelmingly common case of English-language identifiers, JSON keys, and log messages, this roughly halves the memory footprint of every string in the heap compared to pre-JDK 9 behavior, with no code changes required — it's transparent at the API level.

## Concatenation: + vs. StringBuilder

A single `+` between string literals is folded by the compiler into one constant. Inside a loop, though, each `+` used to compile to a fresh `StringBuilder`, append calls, and a `toString()` — repeated on every iteration.

```java
// Historically: a new StringBuilder allocated on every iteration
String csv = "";
for (String id : ids) {
    csv += id + ",";   // O(n²) behavior across the whole loop
}
```

Since JDK 9, `+` concatenation is compiled using `invokedynamic` and `StringConcatFactory`, which can choose a more efficient strategy than the naive per-operation `StringBuilder` approach — but it still doesn't fix the fundamental issue of repeated concatenation building up quadratic work across a loop. The fix is the same as it's always been: use an explicit `StringBuilder` for anything built incrementally.

```java
StringBuilder csv = new StringBuilder();
for (String id : ids) {
    csv.append(id).append(',');
}
```

| Scenario | Recommended approach |
| --- | --- |
| Concatenating a small, fixed number of values | `+` is fine, compiler handles it well |
| Building a string incrementally in a loop | `StringBuilder` explicitly |
| Joining a collection with a delimiter | `String.join(...)` or `Collectors.joining(...)` |
| High-duplication runtime strings at scale | Consider `intern()`, after measuring |

None of this requires micro-managing every string in ordinary code — the compiler and runtime handle the common cases well. It matters specifically in hot paths: request parsing, log formatting under high throughput, and any loop that builds strings proportional to input size.
