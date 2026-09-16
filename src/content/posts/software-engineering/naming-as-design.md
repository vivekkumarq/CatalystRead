---
title: "Naming as Design, Not Decoration"
slug: "naming-as-design"
description: "A name is a promise about behavior, cost, and side effects — bad names mislead quietly, and that cost compounds across every reader."
publishedAt: "2025-10-20"
updatedAt: "2026-09-16"
category: "Software Engineering"
tags:
  - Software Engineering
  - Clean Code
  - Code Quality
  - Software Architecture
---

A name is the smallest unit of API design a codebase has, and it's the one every single caller is forced to read. Bad names don't just look unpolished — they actively mislead, and misleading names cost more debugging time collectively than almost any other code smell, because the cost is paid silently, one confused reader at a time, never showing up as a single traceable incident.

## A Name Is a Promise

`getUser(id)` promises a lookup — cheap, side-effect-free, safe to call repeatedly. If it actually creates a user record when one doesn't exist, every caller who trusted the name just inherited a bug they had no way to see coming from the call site.

```java
// The name lies about what happens
public User getUser(String id) {
    User user = repository.findById(id);
    if (user == null) {
        user = createDefaultUser(id);  // surprise: this is a write
    }
    return user;
}
```

The fix isn't a comment explaining the surprise — it's a name that doesn't need one: `getOrCreateUser(id)`. The rule underneath this: a name should make its side effects, its cost, and its failure behavior predictable *without* reading the implementation. If a reader has to open the function body to know whether it's safe to call in a loop, the name already failed at its job.

## Symmetry Signals Intent

Paired operations should read as pairs — `open`/`close`, `add`/`remove`, `lock`/`unlock` — not `open`/`terminate` or `add`/`discard`. Inconsistent naming for symmetric operations forces every reader to double-check whether `discard` really is the inverse of `add`, or whether it does something subtly different. This sounds pedantic until a codebase has both `deleteUser` (hard delete) and `removeUser` (soft delete, sets a flag) and nobody outside the original author can guess which is which without opening both implementations.

## Precision Over Brevity, Brevity Over Cleverness

`data`, `info`, `manager`, `helper`, `handler` are the words that mean everything and therefore mean nothing — a `UserManager` could plausibly do anything from validation to persistence to sending emails, and the name gives the reader zero signal about which. The fix is usually mechanical: replace the vague noun with what the thing actually *does* — `UserManager` becomes `UserRegistrationService` or `UserRepository` depending on what's actually inside it, and the split often reveals the class was doing two unrelated jobs a vague name had been hiding.

At the same time, `numberOfActiveUsersInCurrentBillingPeriod` is precise but unreadable at a glance — the goal is the shortest name that remains unambiguous in its actual scope, not the longest name that's technically correct. A loop variable named `i` is fine in a five-line loop and a liability in a fifty-line one; scope is part of how much a name needs to say.

## Renaming Is Cheap; Living With a Bad Name Isn't

Modern IDEs make a rename a mechanical, safe refactor — the actual cost of a bad name isn't fixing it, it's the compounding interest of everyone who reads it before someone finally does. Treating "this name doesn't say what it does" as worth a PR comment, the same way a bug would be, is the cultural shift that keeps names honest — not a naming convention doc nobody rereads after onboarding, but an ongoing willingness to say "this promise doesn't match what's inside" whenever it doesn't.

## A worked example

`chargeCard` vs `processPayment` vs `handleData`. You name the module after the domain (`invoice`) not the pattern (`manager`). A PR that only renames after the model settled. Glossary in the README for `Leg` vs `Slice`. You avoid `Util`, `Helper`, `Manager` unless you can say what it manages.

A bad name that encoded a lie (`TemporaryCache` that is the source of truth) gets a ticket.

## Failure modes

Hungarian notation in 2026. Names that encode types TypeScript already has. Joke names in prod. Inconsistent synonyms (`user`/`account`/`customer`). Renaming without updating logs and metrics. Abbreviations nobody shares.

`data2`.

## When this is the wrong tool

A 20-minute spike. Do not bikeshed a throwaway script. Mass renames that break git blame for no semantic gain can wait. If the domain is unsettled, a slightly wrong name plus a comment beats a weekly rename. Generated code names should stay generated. Skip poetry.

## A worked failure mode

`data2` and `ManagerImpl` hide that the method charges a card. A rename PR bikesheds while the invariant is unnamed. The failure is names that do not encode the contract. Name after the domain event and the failure mode; then the code review is shorter.

Renaming is the wrong tool to fix a wrong abstraction. Do not spend a week on synonyms. Name when the wrong word caused a bug.

A second, quieter failure is operational: the idea is copied from a talk into a path that has no rollback, no owner, and no metric that would show the invariant breaking. For "Naming as Design, Not Decoration", that usually means a Friday deploy with production as the first realistic test. Write down the user-visible symptom, the invariant, and the revert before you scale the pattern. If revert is a data rewrite, you do not have a revert—you have a project. Practice the failure in staging with production-sized data at least once, or you will practice it on customers.
