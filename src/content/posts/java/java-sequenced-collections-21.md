---
title: "Sequenced Collections in Java 21: Order as a Type, Not a Comment"
slug: "java-sequenced-collections-21"
description: "JEP 431: SequencedCollection, SequencedMap, reversed views, and how new addFirst/getLast methods change APIs without a new List subtype zoo."
publishedAt: "2026-09-05"
category: "Java"
tags:
  - Java
  - Collections
  - Java 21
  - APIs
sources:
  - title: "JEP 431: Sequenced Collections"
    publisher: "OpenJDK"
    url: "https://openjdk.org/jeps/431"
  - title: "SequencedCollection javadoc"
    publisher: "Oracle"
    url: "https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/SequencedCollection.html"
---

For decades, "this `Collection` has a defined encounter order" was javadoc. `List` had order and indexes. `Deque` had ends. `LinkedHashSet` had order but was a `Set`, so you wrote `iterator().next()` rituals to get the last element. **JEP 431** (Java 21) introduces `SequencedCollection`, `SequencedSet`, and `SequencedMap`: types that promise a **first and last**, plus `addFirst` / `addLast` / `reversed()`.

## What you get on types you already use

`List` is a `SequencedCollection`. `LinkedHashSet` is a `SequencedSet`. `LinkedHashMap` and `SortedMap` are `SequencedMap`. `new LinkedHashSet<>().getFirst()` is finally a real method. `reversed()` returns a view: mutations (where allowed) write through. That view is not a copy; do not stash it, mutate the original, and expect a snapshot.

```java
SequencedSet<String> s = new LinkedHashSet<>();
s.addLast("a");
s.addLast("b");
String last = s.getLast();          // "b"
SequencedSet<String> r = s.reversed();
```

`ArrayList` reversed views have interesting performance: some operations become linear. Read the implementation notes before you `addFirst` in a hot loop on an `ArrayList` — you may have wanted `ArrayDeque`.

## Why not only Deque?

`Deque` is a double-ended queue; it does not cover ordered sets and maps. Sequenced collections unify "has encounter order" across the hierarchy without forcing `LinkedHashSet` to implement `List`. APIs can now take `SequencedCollection<T>` when they need stable order but not indexes.

Watch **covariant overrides**: `reversed()` on `List` returns `List`. Calling `getFirst()` on an empty sequenced collection throws `NoSuchElementException`, same family as `Deque`. Empty checks remain your job.

## Migration notes

New methods showed up on existing types. Code that used reflection over `List` methods may see extras. Third-party collections that implement `List` but not the new defaults need work if they are not on JDK 21's abstract classes. `SortedSet` encounter order is the sort order; `addFirst` may throw if it would break the comparator — sequenced does not mean "arbitrary insert at front" for tree sets.

If you needed tree bins in `HashMap`, that is a different article and a different type: `HashMap` still has no encounter order. Do not use `SequencedCollection` as a performance story. It is an API honesty story.

Read JEP 431's motivation section, then replace the `toArray()[length-1]` hacks on `LinkedHashSet` in your codebase. The type system can finally say what the comment said.
