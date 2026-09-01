---
title: "Backstage: How Spotify's Internal Sprawl Led to a Developer Portal"
slug: "spotify-backstage-developer-portal-platform-teams"
description: "How thousands of undiscoverable microservices inside Spotify led to Backstage, the developer portal it later open sourced through the CNCF."
publishedAt: "2026-01-17"
category: "Spotify"
tags:
  - Engineering at Scale
  - Spotify
  - Developer Experience
  - Platform Engineering
---

Spotify's squad-based engineering culture, with hundreds of small autonomous teams each owning their own services, produces a natural side effect: a lot of services, built and operated independently, with no single place to find out what exists, who owns it, or whether it's healthy. By the mid-2010s, Spotify's internal engineering surface had grown into thousands of microservices, and simply answering "who owns this thing and is it okay" had become its own recurring source of friction, especially for anyone crossing team boundaries — onboarding a new engineer, tracking down an on-call owner, or auditing which services still used a deprecated library.

## The discoverability problem behind fragmentation

The underlying issue wasn't that Spotify lacked tooling — it was that tooling was scattered across many disconnected systems: one place for CI status, another for service ownership, another for documentation, another for infrastructure provisioning. An engineer trying to understand a service they didn't own had to hop between multiple internal tools, each with its own login and its own partial view, to piece together a full picture. That friction discouraged cross-team contribution and made platform teams' job of enforcing standards — consistent monitoring, up-to-date dependencies, documented ownership — much harder, because there was no central inventory to check compliance against.

## A single pane of glass, built around a software catalog

Spotify's answer, Backstage, centered on a software catalog: a structured registry of every service, library, and infrastructure component, each with declared metadata like its owning team, its documentation, its dependencies, and links to its CI/CD status. On top of the catalog, Backstage added software templates for scaffolding new services with sane defaults baked in, and a plugin architecture letting teams surface their own tools — CI dashboards, cost data, incident history — inside the same portal rather than as yet another standalone destination. The catalog turned "who owns this and is it healthy" from a multi-tool investigation into a single lookup.

## Open sourcing it, and why platform teams mattered

Spotify open sourced Backstage in 2020 and donated it to the Cloud Native Computing Foundation in 2022, and it's since become one of the more widely adopted developer portal frameworks industry-wide. The broader lesson Spotify drew, echoed in its public engineering talks, is that platform teams earn their keep by removing this kind of cross-cutting friction for everyone else — a catalog and a portal don't ship product features directly, but they reduce the tax every team pays navigating the company's own infrastructure, which compounds across hundreds of squads.

## What you can borrow

- As the number of independently owned services grows, ownership and discoverability become their own engineering problem — don't wait for onboarding pain or incident response confusion to force the issue.
- A structured catalog with clear metadata (owner, docs, dependency links) is worth building before you need it for compliance audits or incident response, not after.
- Consolidating scattered internal tools behind one portal reduces context-switching cost for engineers working outside their own team's usual territory — that cost is easy to underestimate because it's paid in small, frequent increments.
- Platform investment that doesn't ship product features can still have a strong ROI if it removes friction that every team pays repeatedly.
