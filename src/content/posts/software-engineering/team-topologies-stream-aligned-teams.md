---
title: "Team Topologies: Stream-Aligned Teams and the Platforms They Should Consume"
slug: "team-topologies-stream-aligned-teams"
description: "Skelton and Pais: stream-aligned, platform, enabling, and complicated-subsystem teams — and the interaction modes that stop a matrix from forming by accident."
publishedAt: "2026-09-01"
category: "Software Engineering"
tags:
  - Software Engineering
  - Organizations
  - Team Topologies
  - Platform
sources:
  - title: "Team Topologies"
    author: "Matthew Skelton and Manuel Pais"
    publisher: "IT Revolution, 2019"
    url: "https://teamtopologies.com/"
  - title: "Team Topologies resources"
    publisher: "teamtopologies.com"
    url: "https://teamtopologies.com/resources"
---

Conway's law says the org chart leaks into the architecture. **Team Topologies** (Skelton and Pais) gives four team types so you can **choose** the leak. **Stream-aligned** teams own a flow of change to a user-facing value stream. **Platform** teams provide internal products that reduce cognitive load. **Enabling** teams coach (temporarily). **Complicated-subsystem** teams wrap a gnarly domain (a pricing engine, a codec) so stream teams need not all become specialists.

## Cognitive load is the constraint

A stream team that must also be a Kubernetes distro vendor, a DBA, and a mobile shop will not stream. The platform's job is a **paved road** with a good UX, not a ticket queue named "platform." If stream teams open an incident ticket to get a namespace, you built a bottleneck, not a platform. Interaction mode should be **X-as-a-Service** for a mature platform, **collaboration** while the API is being discovered, and **facilitating** for enabling teams.

```text
stream  --X-as-a-Service-->  platform (golden paths)
stream  --collaboration-->   complicated-subsystem (early)
enabling --facilitating-->   stream (for a quarter, then leave)
```

Reverse Conway: split services along the team boundaries you want, don't share a database across two stream teams "for efficiency."

## Anti-patterns the book names

A frontend team / backend team split that requires a project manager to ship a checkbox. A platform that is a collection of specialists with no product manager. Enabling teams that become permanent owners. Matrix org with dotted lines that recreate silos.

Team size: small enough for trust, large enough to ship. Dunbar-ish limits apply; the book prefers the "two-pizza" heuristic without pretending it is physics.

## How to use this without a reorg theater

Map value streams. Name the cognitive load (too many tools, too many services). Pick one platform surface to productize (CI, observability, or a developer portal — not all three in a month). Time-box an enabling engagement. If after six months every change still needs a CAB and three teams, you have a topology of **coordination**, not streams.

Read Team Topologies' team types and interaction modes chapters. Then look at your last quarter's dependencies. Each arrow that is "wait for the other team" is a candidate for a platform API or a team merge. The vocabulary is useful only if it changes who waits on whom.
