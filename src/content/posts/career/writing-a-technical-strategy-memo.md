---
title: "Writing a Technical Strategy Memo That Can Be Disagreed With"
slug: "writing-a-technical-strategy-memo"
description: "Context, options, decision, and risks: a memo that beats a 40-slide deck because it has a thesis and a date it should be wrong by."
publishedAt: "2026-09-07"
category: "Career"
tags:
  - Career
  - Writing
  - Strategy
  - Staff Engineer
sources:
  - title: "Staff Engineer: Writing"
    author: "Will Larson"
    url: "https://staffeng.com/"
  - title: "Amazon six-pagers (culture of writing)"
    publisher: "various public descriptions of Amazon working backwards"
    url: "https://www.allthingsdistributed.com/"
---

A technical strategy memo is a **document with a recommendation**, not a brainstorm. It states the problem in operational terms, the constraints (compliance, budget, talent), the **options** you considered, the **decision**, and the **risks** plus leading indicators. People can comment on a paragraph. They cannot comment on a slide that says "synergy" over a hexagon.

## A shape that works

1. **Context** (one page): what is true, metrics, who hurts.  
2. **Thesis** (a few sentences): we will do X in 12 months because Y.  
3. **Options** (including "do nothing"): costs, time-to-value, what we give up.  
4. **Plan**: milestones, owners, explicit non-goals.  
5. **Risks and checks**: what would falsify this in six months.

```text
Decision: retire Datacenter ZooKeeper to etcd-on-EKS by Q3
Non-goal: rewrite Kafka
Falsify if: p99 metadata exceeds 50ms after canary
```

Link to ADRs for local decisions. The memo is the **portfolio**. Keep it under ~six pages; appendix for tables. Amazon's six-pager culture is a useful extreme: narrative first, slides later if at all.

## Tone

Skip empty jargon. Name teams and systems. Steelman the strongest objection (usually cost or risk to the current quarter). If you cannot steelman, you have not talked to the people who will kill this in a meeting.

A memo without an owner is a blog post. A memo without a date to revisit is dogma.

## Circulation

Send to the smallest group that can say yes, then widen. Collect comments in the doc. If a VP only reads the thesis and the cost table, put those first.

Read how your org actually decides (some want a deck; still write the memo first and paste). Then pick a live fork in the road and write two pages this week. Strategy that exists only in your head is a 1:1. Strategy that can be forwarded is leverage. The quality bar is: a smart skeptic can disagree **specifically**.
