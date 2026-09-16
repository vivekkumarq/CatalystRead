---
title: "The Foreign Function and Memory API: Replacing JNI Without Pretending C Is Java"
slug: "java-foreign-function-memory-api"
description: "JEP 454: Arena, MemorySegment, Linker, and why bounded lifetimes beat ByteBuffer folklore for off-heap and native calls."
publishedAt: "2026-09-02"
category: "Java"
tags:
  - Java
  - FFM API
  - JNI
  - Performance
sources:
  - title: "JEP 454: Foreign Function & Memory API"
    publisher: "OpenJDK"
    url: "https://openjdk.org/jeps/454"
  - title: "JEP 442: Foreign Function & Memory API (Third Preview)"
    publisher: "OpenJDK"
    url: "https://openjdk.org/jeps/442"
---

JNI works and JNI is a tax: `native` methods, `javac -h`, fragile ABIs, and `DirectByteBuffer` lifetimes that nobody owns. The **Foreign Function & Memory API** (FFM, JEP 454 in JDK 22) is the JDK's supported way to allocate off-heap memory, describe C layouts, and call functions through a `Linker`. It is not a reason to rewrite working JNI in a weekend. It is a reason to stop growing new JNI for libraries you could bind from Java.

## Arenas are the lifetime model

A `MemorySegment` is a range of addresses with a **temporal bound** (an `Arena`) and spatial bounds. When the arena closes, segments are invalid; use-after-close fails predictably instead of corrupting the heap. Confined arenas are single-thread. Shared arenas allow more threads and more responsibility. Auto arenas tied to `Cleaner` exist; prefer explicit try-with-resources for native calls you understand.

```java
try (Arena arena = Arena.ofConfined()) {
  MemorySegment s = arena.allocate(1024);
  Linker linker = Linker.nativeLinker();
  SymbolLookup stdlib = linker.defaultLookup();
  MethodHandle strlen = linker.downcallHandle(
      stdlib.find("strlen").orElseThrow(),
      FunctionDescriptor.of(ValueLayout.JAVA_LONG, ValueLayout.ADDRESS));
}
```

`MemoryLayout` describes structs and padding. Getting padding wrong is still a C bug; FFM just lets you write it in Java. Alignment matters on AArch64 more than folklore from x86 JNI will have taught you.

## Downcalls, upcalls, and the loader

Downcalls are Java → C. Upcalls are C → Java (`Linker.upcallStub`) and require a live segment for the stub. Do not leak upcall stubs. Restricted methods (`System.load`, native access) need `--enable-native-access` (or module flags) on modern JDKs. That flag is a feature: native access is a security boundary.

Performance: FFM can match or beat JNI by skipping some copy and by specializing linking. It will not beat a well-tuned intrinsic. Measure. Copying a 16-byte struct is not why your p99 is 200ms.

## When JNI still wins

Existing large JNI surfaces (graphics, databases) stay. Code that needs JVM TI or undocumented HotSpot internals stays. FFM is for POSIX calls, vendor C libraries, and off-heap structures you used to fake with `Unsafe`. `Unsafe` is being fenced; FFM plus `VarHandle` on segments is the replacement path.

Read JEP 454's goals and non-goals. Then wrap one library with a small Java facade that never exposes `MemorySegment` to the rest of the app. The API is powerful enough to scatter lifetime bugs through the codebase if every service touches arenas directly.
