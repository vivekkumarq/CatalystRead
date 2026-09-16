---
title: "equals, hashCode, and the Contracts That Break Collections"
slug: "equals-hashcode-contracts-that-break-collections"
description: "A broken equals or hashCode doesn't crash your program — it quietly corrupts HashMaps and HashSets in ways that only show up much later."
publishedAt: "2025-04-21"
updatedAt: "2026-09-16"
category: "Java"
tags:
  - Java
  - Collections
  - equals
  - hashCode
---

Of all the contracts in the Java standard library, the `equals`/`hashCode` contract is the one most likely to be violated silently. Get it wrong and nothing throws an exception — your `HashSet` just starts allowing duplicates, or your `HashMap.get()` returns `null` for a key you're certain you put in. These bugs are miserable to track down precisely because the failure is delayed and looks unrelated to the code that caused it.

## The Contract, Precisely

`Object.hashCode()`'s documentation states three rules, but only one causes real damage when broken:

1. Consistent: repeated calls on the same object return the same hash code, provided nothing used in `equals` changes.
2. **If two objects are equal according to `equals()`, they must have the same `hashCode()`.** This is the one that breaks collections.
3. Two unequal objects are *not* required to have different hash codes (collisions are legal and expected).

Rule 2 is not optional guidance — it's a hard requirement for `HashMap` and `HashSet` to function. Here's what happens when it's violated:

```java
public class OrderId {
    private final String value;

    public OrderId(String value) { this.value = value; }

    @Override
    public boolean equals(Object o) {
        if (!(o instanceof OrderId other)) return false;
        return value.equals(other.value);
    }

    // No hashCode override — inherits Object's identity-based hashCode
}
```

Two `OrderId` instances with the same `value` are `equals()`, but they have different `hashCode()` values, because the default implementation hashes on object identity. A `HashSet<OrderId>` will happily store both as separate elements, and `map.get(new OrderId("A-1"))` will return `null` even after `map.put(new OrderId("A-1"), ...)`, because the lookup hashes to a different bucket than the stored entry.

## Records Get This Right by Default

This is one of the strongest practical arguments for records over hand-written value classes: the generated `equals` and `hashCode` are derived from the same component list, so they're structurally guaranteed to agree.

```java
public record OrderId(String value) {}
```

No override needed, no risk of the two methods drifting out of sync during a refactor where someone adds a field to `equals` and forgets `hashCode` (or vice versa) six months later.

## Mutable Fields Are the Other Trap

Even a correctly-implemented `equals`/`hashCode` pair breaks collections if the fields they depend on are mutated *after* the object is inserted into a hash-based collection.

```java
Set<Tag> tags = new HashSet<>();
Tag urgent = new Tag("urgent");
tags.add(urgent);

urgent.setName("high-priority"); // mutates the field hashCode depends on

tags.contains(urgent);  // often false — it's now in the wrong bucket
tags.remove(urgent);    // often false too — same reason
```

The object is still in the set — iterating will find it — but `contains` and `remove` compute the current hash code, look in the bucket that hash now maps to, and don't find it there because it's still sitting in the bucket for its *old* hash code. This is a strong argument for making any class used as a hash key immutable, or at minimum never mutating the fields involved in `equals`/`hashCode` while the object is a live collection member.

## A Practical Checklist

| Rule | Consequence if broken |
| --- | --- |
| Equal objects must have equal hash codes | Duplicates in Sets, failed lookups in Maps |
| hashCode must be consistent while unmutated | Same object "disappears" from collections mid-life |
| equals must be reflexive, symmetric, transitive | Comparisons behave inconsistently depending on argument order |
| Don't use mutable fields in equals/hashCode for map/set keys | Object becomes unfindable after mutation |

If you're overriding one of `equals` or `hashCode` by hand and not the other, stop — that's very likely a bug waiting to be discovered in production, not in code review. Prefer records or your IDE's generator, both of which keep the two in lockstep automatically.

## A worked failure mode

An entity uses mutable `id` in `hashCode`. It is put in a `HashSet` before persist (`id=null`), then id is assigned; the set cannot find it. A Lombok `@Data` on a JPA entity includes a lazy collection in equality and triggers lazy loads in `HashSet`. The failure is equality that changes while hashed, or that touches the database. Use business keys that are stable, or identity for entities, and never include lazy relations.

## When this is the wrong tool

Custom equality is the wrong tool when identity is enough. Do not implement `equals` for entities "because the IDE warned." Value objects should be equal by value; entities usually by id once assigned. Keep collections honest.

Treat the counterexample as part of the spec. Someone will apply "equals, hashCode, and the Contracts That Break Collections" to a problem that only looks similar at the noun level—same words, different constraints. Require a one-page fit check: scale, consistency, failure domains, and who is on call. If two of those are guesses, run a spike, not a rewrite. The expensive bugs are not the ones in the happy-path tutorial; they are the ones where the tutorial's silent assumptions were load-bearing.
