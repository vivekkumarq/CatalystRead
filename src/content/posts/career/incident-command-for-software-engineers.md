---
title: "Incident Command for Software Engineers Who Are Not Full-Time SRE"
slug: "incident-command-for-software-engineers"
description: "A lightweight IC / comms / ops split you can run at 2am, what to write in the first fifteen minutes, and how to hand off without dropping context."
publishedAt: "2026-09-02"
updatedAt: "2026-09-16"
category: "Career"
tags:
  - Career
  - Incidents
  - SRE
  - Engineering Culture
sources:
  - title: "Incident Command System"
    publisher: "FEMA / widely adapted in tech"
    url: "https://www.fema.gov/emergency-managers/nims/components"
  - title: "Managing Incidents"
    publisher: "Google SRE Book"
    url: "https://sre.google/sre-book/managing-incidents/"
---

Most product engineers meet incident command on a night when the checkout flow is down and six people are debugging in the same Slack thread. Roles feel ceremonial until you have lived the failure mode they prevent: everyone investigating, no one talking to customers, and the person who knows the system also trying to write the status page sentence.

Google's SRE book and the civil ICS tradition agree on a small split. You do not need a vest. You need names.

## Three seats, even on a four-person team

**Incident commander (IC).** Owns priorities, decides what is in or out of scope, calls for more people, declares resolved. Does **not** have to be the best debugger. In fact, the best debugger should often stay out of the IC seat so they can keep hands on the system.

**Ops / technical lead.** Directs the actual changes: rollback, feature flag, scale-up. One person (or a tight pair) with keyboard access, not five concurrent deploys.

**Comms.** Writes the customer-facing and internal timeline. Repeats facts, not theories. "We are rolling back deploy 1847" is a fact. "Probably DNS" is not, until it is checked.

If you have two people, IC and ops combine poorly; IC and comms combine better. The IC can paste a three-line update every 15 minutes while ops stays in the terminal.

## The first fifteen minutes

1. Name the incident and the IC in the channel topic.
2. State user impact in one sentence ("20% of checkouts 500 since 01:12 UTC").
3. Freeze risky deploys.
4. Pick the first hypothesis and a timebox ("if still broken at 01:25, rollback").
5. Start a running doc with timestamps.

Do not wait for a perfect severity number. You can upgrade Sev-2 to Sev-1; you cannot un-confuse a thread that already has four theories.

## Handoff

When the IC's brain is fried, a handoff is a five-minute briefing: impact, what we tried, what we must not try again, next check time. Write it. Verbal-only handoff at 4am loses the "we already bounced that pod" fact.

Afterward, the IC should not own the entire postmortem because they will defend their live decisions. A different facilitator and a timeline from the doc beat memory.

This is a career skill because the people who stay calm and make the room smaller get trusted with larger systems. You can practice it on a game day before you need it on a holiday.

## A worked channel in the first half hour

01:12 IC named in topic: `checkout-5xx | IC @sam | sev2`. Impact sentence pinned. Deploy freeze announced once. Ops takes rollback of 1847 as the timeboxed first move; two other people who wanted to restart Redis are asked to wait. Comms posts internally at 01:15 and 01:30 with facts only. At 01:18 rollback completed; error rate still high — hypothesis 1 is wrong, recorded as such, not deleted. Next timebox: disable the new payment flag. At 01:27 rate recovers. IC keeps the channel open until a watch period ends, then names a handoff or resolution.

The running doc has those timestamps. The Slack thread is not the doc; paste links into the doc.

## Failure modes

**Everyone is IC.** Parallel rollbacks, a scale-up, and a schema migrate in the same five minutes. Pick one ops lead.

**Debugger as IC.** The person who can read the traces is writing the status page sentence and neither happens well.

**Theories in the customer update.** “Probably a BGP flap” in public comms is how you issue a later correction and lose trust.

**No freeze.** A scheduled deploy lands mid-incident and you cannot tell which change hurt.

**Heroics without a watch.** “Fixed” at 01:27, everyone leaves, recurrence at 02:10 with an empty channel.

## When not to run full ICS theater

A single-engineer flaky job at 10am is a ticket, not a command structure. Declaring Sev-1 for a metrics blip trains people to ignore roles. Conversely, a silent “we will just fix it” on a customer-facing outage with eight people in Slack *is* the failure mode ICS prevents — use the seats even if the names are informal.

Game days should practice handoff and comms, not only the technical inject. The muscle you need at 4am is the briefing, not a new dashboard.

## Review checklist

- Topic has IC name, impact, and severity (even if approximate).
- One person with keyboard for mutating production.
- Timeboxed hypotheses; failed ones stay on the timeline.
- Handoff is written; postmortem facilitator is not the IC.
