---
title: "Blameless Postmortems That Actually Change Things"
slug: "blameless-postmortems-that-actually-change-things"
description: "Why most postmortems produce a document nobody acts on, and what separates a blameless postmortem process that genuinely prevents repeat incidents."
publishedAt: "2025-08-28"
updatedAt: "2026-09-16"
category: "Software Engineering"
tags:
  - Software Engineering
  - Incident Management
  - Engineering Culture
  - Reliability
---

Most teams have a postmortem template. Far fewer teams have a postmortem process that reliably changes what happens next time. The gap between the two isn't about the document format — it's about whether the process actually surfaces the real systemic cause and whether the organization follows through on what it finds.

## Blameless means analyzing the system, not the person

"Blameless" gets misread as "nobody feels bad," but the actual point is analytical, not emotional: an individual's mistake is almost never a sufficient explanation for an incident, because if a single engineer's single action could take down production, the system had already accepted that risk long before that engineer showed up. The postmortem's job is to find out why the system allowed that action to have that consequence — why there was no review catching it, no automated check preventing it, no rollback fast enough to limit the blast radius.

This isn't about avoiding accountability. It's about locating accountability at the level where a fix is actually possible. "The engineer should have been more careful" isn't actionable — carefulness doesn't scale as a mitigation. "The deploy pipeline allowed an unreviewed config change to reach production" is actionable, because you can build a control for that.

## Getting to the real cause, not the first plausible one

The instinct in a postmortem is to stop at the first explanation that sounds sufficient — "a bad config was deployed" — and move on to writing action items. That's usually only the proximate cause. Asking "why was that possible" repeatedly, five times as a rule of thumb, usually surfaces a chain: the config was deployed without review because the change looked trivial, it looked trivial because the tooling doesn't distinguish trivial from high-risk changes, and the tooling doesn't distinguish them because nobody built that classification when the pipeline was first set up. The fix that comes out of the fifth "why" prevents an entire category of future incidents; the fix that comes out of the first one prevents only this exact repeat.

Timeline reconstruction matters more than most teams invest in it. A precise, minute-by-minute account of what was observed, what was assumed, and what action was taken at each point reveals where the response itself lost time — a slow alert, a confusing dashboard, an unclear escalation path — which is often as fixable as the original trigger and just as likely to matter in the next incident.

## Action items need owners, deadlines, and follow-through

A postmortem that ends with a list of action items and no tracking is a postmortem that produced a document, not a change. Every action item needs a named owner and a real deadline, entered into the same system the team already uses to track other committed work — a separate "postmortem action items" backlog that nobody looks at is where good intentions go to expire quietly.

Track completion rate across postmortems as its own metric. A team that closes 90% of its action items is building a system that gets measurably safer over time. A team that closes 20% is running the same postmortem for the same category of incident repeatedly, just with different dates on the document.

## Making the practice sustainable

Postmortems for genuinely minor incidents, run with the same ceremony as a major outage, burn goodwill fast and teach people to dread the process. Calibrate the depth of review to the severity and novelty of the incident — a well-understood failure mode that's already been fixed once doesn't need the same five-whys treatment as something the team has never seen before. And share postmortems broadly, not just within the team that owned the incident; the most valuable ones are read by people on entirely different teams who realize they have the exact same latent risk in their own system, and fix it before it becomes their incident.

## A worked failure mode

A postmortem is blameless in tone and empty in action items. "Be more careful" is assigned to everyone. The same incident repeats. Another doc blames a named intern in a private channel. The failure is no mechanism. Actions have owners, due dates, and a review; contributing factors are systemic.

## When this is the wrong tool

A full postmortem is the wrong tool for a trivial, well-understood flake you already fixed. Theater docs are worse than none. Do not skip them when customers were impacted. Write them when you need the org to change a condition.

A second, quieter failure is operational: the idea is copied from a talk into a path that has no rollback, no owner, and no metric that would show the invariant breaking. For "Blameless Postmortems That Actually Change Things", that usually means a Friday deploy with production as the first realistic test. Write down the user-visible symptom, the invariant, and the revert before you scale the pattern. If revert is a data rewrite, you do not have a revert—you have a project. Practice the failure in staging with production-sized data at least once, or you will practice it on customers.
