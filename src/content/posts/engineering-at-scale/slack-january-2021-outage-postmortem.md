---
title: "What Slack's January 2021 Outage Teaches About Cascading Failure"
slug: "slack-january-2021-outage-postmortem"
description: "Inside the public postmortem for Slack's January 2021 outage, where a networking degradation turned into a self-reinforcing overload across the stack."
publishedAt: "2025-10-30"
updatedAt: "2026-09-16"
category: "Slack"
tags:
  - Engineering at Scale
  - Slack
  - Reliability
  - Networking
  - Incident Response
sources:
  - title: "Slack's Outage on January 4th, 2021"
    publisher: "Slack Engineering"
    url: "https://slack.engineering"
---

The first working Monday of January 2021 was always going to be a heavy-traffic day for Slack — people returning from the holidays and opening every workspace, channel, and DM they'd left idle for two weeks. Slack had planned capacity for a large return-to-work traffic spike. What actually took the service down wasn't the traffic spike in isolation; it was a networking-layer degradation inside AWS that arrived at almost the same moment, and the way Slack's own infrastructure reacted to that degradation turned a recoverable problem into a prolonged, cascading outage. Slack published a detailed public postmortem afterward, and it's become a widely cited example of how failure at one layer of a stack can compound through layers that were never the original problem.

## A networking problem that looked like a database problem

The underlying trigger was degraded performance in the AWS networking substrate Slack's infrastructure depended on, which showed up first as increased packet loss and latency between services rather than as an obvious, clearly-labeled network outage. Because the symptom surfaced as slow and failing calls between internal services — including calls that touched the database tier — on-call engineers initially had to work through layers of ambiguous symptoms to identify that the root cause sat in the network layer at all, rather than in the database or application code that was visibly struggling.

## How the response made things worse before it made them better

This is the part of the postmortem that gets cited most: Slack's autoscaling and provisioning systems, designed to add capacity automatically in response to load, themselves depended on infrastructure that was degraded by the same underlying networking issue. That created a bad feedback loop — the system's automatic response to overload was itself impaired by the thing causing the overload, so capacity that should have come online to absorb the traffic and error-retry storm came online more slowly than the situation required. Meanwhile, clients and internal services retrying failed requests added more load onto an already-degraded network path, compounding the original problem rather than backing off from it.

```text
network degradation --> internal calls slow/fail --> retries add load
        |                                                   |
        +---------------- autoscaling impaired <------------+
                    (provisioning depends on the same degraded network)
```

## Why the postmortem mattered beyond that one day

What made Slack's writeup valuable to the wider engineering community wasn't just the specific AWS dependency — it was the general shape of the failure: a lower layer degrades, higher layers react in ways that assume that lower layer is healthy, and the recovery mechanisms themselves turn out to share a fate with the thing they're supposed to recover from. Slack's follow-up work included examining dependencies between provisioning and scaling systems and the infrastructure they scale, specifically looking for these kinds of circular dependencies where a system's remediation path quietly depends on the exact resource that's failing.

## A concrete failure mode from a well-known Slack outage

Public Slack incident writing is useful because the failure is rarely "we forgot HA." It is a cascade: a control-plane or cache issue, a retry storm from millions of clients, and a recovery plan that itself overloads the system you are trying to bring back. Mid-size steal: a reconnect budget. Clients must back off with jitter and a cap, or your restoration is a second outage. Load-shed non-critical work — emoji, presence, search — so message send can return.

Operational gotcha: status pages that lie because they depend on the same DNS or provider that is down. Host status independently. Another is restoration order: if you warm caches by letting all traffic in, you recreate the stampede. Recover in slices of workspaces or regions. The January-era lesson that transfers is client behavior as part of the architecture. Desktop apps that retry immediately are distributed denial of your own site. Test that path with Toxiproxy-like stalls. Postmortems that only list vendor root causes miss the amplification you own. Write down which queues you will drop, which features go read-only, and who may press the shed button without a meeting. Then rehearse it. An outage runbook that has never been run is fiction. Slack's scale makes the cascade spectacular; the shape appears at 100k connected clients too.

## What you can borrow

- Map out whether your autoscaling, provisioning, or failover systems depend on the same infrastructure they're meant to protect you from losing — a circular dependency there turns a contained incident into a compounding one.
- Retries without backoff during a degradation add load to an already-struggling system; make sure retry logic across your service graph, not just at the client edge, has sane backoff behavior.
- A symptom appearing at one layer (database timeouts) doesn't mean the root cause is at that layer — build enough cross-layer visibility that on-call engineers can distinguish "the database is the problem" from "the network beneath everything is the problem."
- Publishing a detailed, specific public postmortem after a major incident is itself valuable: it forces the internal writeup to be equally rigorous, and it gives the rest of the industry a real case study instead of a vague "we had an outage" notice.
