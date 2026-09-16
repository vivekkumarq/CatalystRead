---
title: "Writing Design Docs That Get Approved"
slug: "writing-design-docs-that-get-approved"
description: "Design docs stall for predictable reasons — missing context, buried trade-offs, no clear ask — and each one has a specific, fixable cause."
publishedAt: "2025-05-07"
updatedAt: "2026-09-16"
category: "Career"
tags:
  - Career
  - Technical Writing
  - Engineering Culture
  - Software Engineering
---

A design doc that goes through three rounds of confused comments and stalls for a month is rarely stuck because the underlying idea is bad. It's usually stuck because the document is answering questions the reader didn't ask, in an order that doesn't match how they're trying to evaluate it. Getting a doc approved quickly is largely a writing problem, not a technical one, and it responds to specific, learnable fixes.

## Lead with the decision, not the journey

A common structure for a first draft is chronological — here's the problem, here's what I first considered, here's why that didn't work, here's what I considered next, and eventually, several paragraphs in, here's what I'm actually proposing. This mirrors how the thinking happened, which makes it satisfying to write and frustrating to review, because the reader has to hold several rejected options in their head before finding out what they're actually being asked to approve.

Put the recommendation near the top, before the exploration of alternatives. State the problem in a sentence or two, state the proposed solution in a sentence or two, and only then walk through the alternatives you considered and why you didn't pick them. A reader who agrees with the recommendation on sight can skim the rest for validation instead of reading linearly to find out what you're even asking for. A reader who disagrees knows immediately what they're pushing back on, rather than discovering it on page three.

## Make the trade-offs impossible to skip past

Every real design decision involves a trade-off, and burying it inside a paragraph of prose is the single most common reason a reviewer approves a doc and then is surprised by a consequence later — not because the trade-off wasn't disclosed, but because it wasn't visible enough to register during a normal read-through. A short, explicit list of what you're giving up in exchange for what you're gaining, set apart from the surrounding prose, forces a reviewer to actually engage with it rather than skim past it as part of a longer paragraph.

This also protects you later. A trade-off that was clearly flagged and implicitly accepted by an approving reviewer is a very different conversation, six months on, than one that was technically mentioned in passing and gets treated as something you should have called out more clearly.

## Answer the objection before it's raised

Every experienced reviewer in a given domain has a small set of default concerns they reach for automatically — a database person asks about migration safety, a security-minded reviewer asks about auth boundaries, a cost-conscious reviewer asks about resource usage at scale. If you know your audience, you know roughly what these are, and a doc that addresses the two or three predictable objections proactively, in a short "risks and open questions" section, gets through review meaningfully faster than one that waits for the reviewer to raise them and then responds in the comments.

This isn't about pre-emptively winning every argument — sometimes the honest answer is "this is a real risk and I don't have a full mitigation yet, here's my current thinking." Naming it yourself, even without a complete answer, reads as more credible than a document that's silent on a concern the reviewer was always going to have.

## End with an explicit ask

Docs frequently trail off without stating clearly what kind of response is being requested — is this asking for a sign-off to start building, feedback on the general direction, or just visibility into a decision that's already been made. State it directly: "I'm looking for approval to start implementation" reads completely differently to a reviewer than "I'd like feedback on the approach before I go further," and a doc that doesn't specify which one it wants tends to get the vaguer, slower version of both.

## A worked failure mode

A design doc opens with history and tools, and hides the decision on page six. Reviewers argue about the diagram tool. The actual open question—single writer vs multi-region—is never posed as a choice with consequences. A later "approved" doc is reread during an incident and does not match production because the dissenting comment was "resolved" without a change. The failure is a memo that does not force a decision. Start with context, the decision, alternatives, risks, and how you will roll back. Put names on who can say yes. Update the doc when the decision changes.

## When this is the wrong tool

A long RFC is the wrong tool for a reversible, one-file change; a ticket is enough. Docs will not get approval if the political decision is already made in a hallway—name that and stop writing fiction. Do not design-doc a vendor choice you are not allowed to reverse. Use a design doc when the cost of being wrong exceeds the cost of writing, and when multiple groups must live with the result.
