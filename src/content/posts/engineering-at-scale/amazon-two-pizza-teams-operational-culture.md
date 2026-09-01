---
title: "Two Pizzas, One Team: Amazon's Operational Culture Beyond the Slogan"
slug: "amazon-two-pizza-teams-operational-culture"
description: "How Amazon's two-pizza teams, operational readiness reviews, and correction-of-error documents work together as an operating system, not just slogans."
publishedAt: "2026-06-16"
category: "Amazon"
tags:
  - Engineering at Scale
  - Amazon
  - Engineering Culture
  - Operations
---

"Two-pizza team" is the part of Amazon's operating culture that made it into the general engineering vocabulary, but on its own it's just a team-sizing rule — small enough to be fed by two pizzas, roughly six to ten people. What made the idea consequential wasn't the headcount, it was what came with it: those small teams were expected to own a service end to end, and Amazon built supporting processes, most visibly operational readiness reviews and correction-of-error documents, to make that ownership model actually sustainable at scale rather than just an aspiration.

## Small teams, full ownership

The principle behind two-pizza teams, often summarized as "you build it, you run it" — a phrase associated with Amazon CTO Werner Vogels from a widely cited 2006 ACM Queue interview — is that the same people who design and write a service are also the ones who operate it in production and get paged when it breaks. That's a deliberate rejection of the traditional split between a development team that ships code and a separate operations team that keeps it running, a split that tends to create finger-pointing when something goes wrong and misaligned incentives even when nothing does, since a team insulated from operational pain has less reason to invest in reliability.

Team size matters here because ownership without autonomy doesn't scale — a team can't genuinely own a service's full lifecycle if every decision requires coordinating with a large group or waiting on a separate team's roadmap. Keeping teams small keeps communication overhead low and decision-making fast, letting a two-pizza team actually behave like an independent, accountable unit rather than a subgroup perpetually waiting on someone else.

## Operational readiness reviews: earning the right to launch

Before a service goes live, or before a major change ships, Amazon teams commonly go through an Operational Readiness Review (ORR) — a structured checklist-driven assessment covering things like monitoring and alerting coverage, capacity planning, dependency failure handling, rollback procedures, and on-call readiness. The point of an ORR isn't bureaucratic box-checking for its own sake, it's forcing the team that's about to own a service's operational burden to have actually thought through what happens when it breaks, before it breaks in front of customers rather than after. A service that hasn't cleared its ORR generally doesn't launch, which gives the review real teeth rather than making it advisory.

## Correction of Error: postmortems as a company-wide artifact

When something does go wrong, Amazon's internal process for analyzing it is the Correction of Error (COE) document — Amazon's version of a postmortem, built around identifying root causes (frequently using a "5 Whys" style drill-down) rather than stopping at the surface-level trigger, and explicitly avoiding assigning individual blame in favor of finding systemic contributing factors. A COE typically documents what happened, the customer impact, the root cause, and concrete corrective actions with owners and deadlines — turning an incident into a forcing function for real follow-through rather than a one-time conversation that fades from memory once the immediate fire is out.

## The pieces reinforce each other

None of these three practices does much in isolation. Small, autonomous teams without a rigorous pre-launch review would launch under-prepared services; rigorous reviews without genuine ownership would just be a gate a separate team resents clearing; and postmortems without an ownership culture that actually reads and acts on them become theater. Together, they form something closer to an operating system for how Amazon runs production services at scale: teams own what they build, prove readiness before launch, and turn every failure into documented, tracked improvement afterward.

## What you can borrow

- Pair service ownership with operational responsibility — the people who build something should feel its operational pain directly, not through a separate team.
- Keep teams small enough to move and decide independently; ownership without autonomy just creates accountability without the ability to act on it.
- Use a structured readiness checklist before launching anything operationally significant, and treat clearing it as a real gate, not a formality.
- Run blameless postmortems that produce owned, tracked action items — a postmortem that doesn't change anything afterward wasn't worth writing.
