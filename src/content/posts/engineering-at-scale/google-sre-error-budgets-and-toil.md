---
title: "Error Budgets and Toil: How Google Turned Operations Into an Engineering Discipline"
slug: "google-sre-error-budgets-and-toil"
description: "How Google's Site Reliability Engineering practice used error budgets and a hard cap on toil to align reliability work with product velocity."
publishedAt: "2026-02-10"
category: "Google"
tags:
  - Engineering at Scale
  - Google
  - SRE
  - Reliability
---

Ben Treynor Sloss, who founded Google's Site Reliability Engineering function around 2003, described SRE with a line that's become the discipline's unofficial motto: "SRE is what happens when you ask a software engineer to design an operations function." Instead of a traditional ops team that reacts to whatever breaks, Google staffed reliability work with software engineers and gave them a mandate to solve operational problems the way you'd solve any other engineering problem — by building systems and setting policies that reduce the need for human intervention, rather than by adding more humans to intervene.

## The error budget: reliability as a spendable resource

The idea that made SRE more than a rebranding exercise is the error budget. No service is 100% reliable, and chasing 100% is usually wasted effort anyway, since users generally can't distinguish 99.99% availability from 100%, but the cost of chasing that last fraction of a percent grows enormous. So SRE starts by setting an explicit Service Level Objective — say, 99.9% availability over a rolling window — and treats the gap between that target and perfect reliability as a budget the service is allowed to spend.

That reframing changes team incentives directly. If a service is within its error budget, the team is free to ship features, take reasonable risks, and move fast, because they haven't exhausted the unreliability they're allowed. If a service has burned through its error budget, feature launches get paused and the team's priority shifts to reliability work until the budget recovers. This gives product teams and reliability-focused SREs a shared, quantitative, non-political way to decide "should we launch this now or fix stability first" instead of that decision being a recurring argument.

## Toil is worth naming and capping

SRE also gave a name to a specific category of work: toil — manual, repetitive, automatable operational work that scales linearly with service growth and provides no lasting engineering value once completed. Restarting a stuck process by hand, manually provisioning a new instance, hand-editing a config for a routine change — these are all toil, and Google's SRE practice explicitly capped how much of it an SRE's time could be spent on, famously targeting no more than about 50% of an SRE's time going to operational toil, with the rest reserved for engineering work that reduces future toil.

That cap isn't just a wellness policy, it's a forcing function. If toil creeps above the cap, the organizational answer isn't "hire more SREs to absorb more toil," it's "the team must build automation to bring toil back down," because otherwise the whole discipline collapses back into being a traditional ops team that never gets ahead of its own workload.

## Blameless postmortems and shared ownership

SRE's third pillar worth calling out is the blameless postmortem: analyzing an incident to find contributing systemic factors rather than assigning individual fault, on the theory that people don't intentionally cause outages, and a culture of blame just teaches people to hide information rather than surface it. Google published much of this practice publicly in the freely available SRE book, which helped popularize error budgets, SLO-driven engineering, and blameless postmortems across the industry well beyond companies operating at Google's scale.

## What you can borrow

- Set an explicit reliability target rather than an implicit "as reliable as possible" — a number you can budget against beats a vague aspiration.
- Use the error budget to settle feature-velocity-vs-reliability tension with data, not politics.
- Name your toil and put a ceiling on it; an uncapped ops burden only grows.
- Run postmortems that hunt for systemic causes, not individual blame — it's the only way people keep giving you honest information about what actually went wrong.
