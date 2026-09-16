---
title: "API Versioning and Deprecation Policy"
slug: "api-versioning-and-deprecation-policy"
description: "A practical framework for versioning APIs and deprecating old versions without breaking clients you don't control or can't even see."
publishedAt: "2025-12-28"
updatedAt: "2026-09-16"
category: "Software Engineering"
tags:
  - Software Engineering
  - API Design
  - Backend Engineering
---

The hardest part of API versioning isn't choosing a scheme, it's accepting that once an API has external consumers, you've given up the ability to change it freely, and every future change has to route around that constraint instead of through it. Internal APIs where you control every caller can get away with looser discipline. Public or widely-consumed internal APIs cannot, and the policy you set up before the first breaking change is much cheaper than the one you're forced to improvise during an incident caused by a change that broke someone you didn't know was calling you.

## What actually counts as breaking

Removing a field, renaming a field, changing a field's type, or tightening validation on an existing request are all breaking changes, even when they look like cleanup. Adding a new optional field or a new endpoint is generally safe, because well-behaved clients ignore fields they don't recognize. The trap is in the middle ground: changing an error response's shape, adding a new required field, or changing default behavior when a parameter is omitted — these look minor but silently break clients who depended on the old behavior, sometimes without either side noticing until much later.

Write this distinction down explicitly as policy rather than relying on individual engineers to judge case by case, because "is this breaking" is exactly the kind of question where reasonable people disagree under deadline pressure, and a documented standard settles it before that pressure exists.

## Versioning schemes and their trade-offs

URL-based versioning (`/v1/orders`, `/v2/orders`) is the most visible and easiest for consumers to understand and route on, but it encourages entire endpoint duplication even for changes that only affect one field. Header-based versioning (`Accept: application/vnd.api+json; version=2`) keeps URLs stable and allows finer-grained negotiation, at the cost of being less discoverable — a developer browsing your API can't see the version just from the URL.

```
GET /v2/orders/42
Accept: application/vnd.example.orders.v2+json

Response includes X-API-Version header confirming what was served
```

Whichever scheme you choose, the more important decision is granularity: versioning the whole API as a unit is simpler to reason about but forces clients to adopt unrelated changes to get the one they need, while versioning individual resources or endpoints is more flexible but harder to track and document consistently. Most teams are better served by whole-API versioning until the API is large enough that the coordination cost of a full version bump for one endpoint's change becomes the bigger problem.

## Deprecation as a communicated process, not an event

A deprecation policy needs a stated minimum support window — six months and twelve months are common defaults — announced before the clock starts, not discovered by consumers when a version stops working. Communicate through every channel you have: a deprecation header on responses from the old version (`Deprecation: true`, `Sunset: <date>`), documentation updates, and direct outreach to known high-traffic consumers if you have visibility into who they are.

Track actual usage of deprecated versions before removing them, not just the calendar date. A version scheduled for removal in a month that still carries meaningful traffic is a signal to extend the window and investigate who's stuck, not a signal to hold the deadline regardless. The teams that handle deprecation well treat the sunset date as a target that adapts to real usage data, and the ones that handle it badly treat it as an immovable line that gets enforced against consumers who had no idea it was coming.

## Designing for less painful changes later

A surprising amount of future versioning pain can be avoided at design time: including a version identifier in the response payload itself, using envelope structures that tolerate new fields gracefully, and avoiding brittle positional formats. None of this eliminates the need for a versioning policy, but it substantially widens the range of changes that don't require one.

## A worked failure mode

`v2` is launched by breaking `v1` in the same week. Clients cannot pin. A header version is undocumented; mobile binaries in the wild die. Deprecation is a Slack message. The failure is versioning without overlap. Overlap versions, sunset dates, metrics on old versions, and a compatibility test harness.

## When this is the wrong tool

URL versions are the wrong tool for a private UI-only API you ship together. Do not version by mood. Additive change may beat a v2. Use a policy when third parties cannot ship in lockstep.

A second, quieter failure is operational: the idea is copied from a talk into a path that has no rollback, no owner, and no metric that would show the invariant breaking. For "API Versioning and Deprecation Policy", that usually means a Friday deploy with production as the first realistic test. Write down the user-visible symptom, the invariant, and the revert before you scale the pattern. If revert is a data rewrite, you do not have a revert—you have a project. Practice the failure in staging with production-sized data at least once, or you will practice it on customers.
