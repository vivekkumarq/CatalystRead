---
title: "Giving Code Review Feedback That Lands"
slug: "giving-code-review-feedback-that-lands"
description: "How to write code review comments that engineers actually act on, without triggering defensiveness or turning review into a status contest."
publishedAt: "2025-08-05"
category: "Career"
tags:
  - Career
  - Communication
  - Engineering Culture
  - Code Review
---

The mechanics of code review are easy to learn. Clicking through a diff, spotting a missing null check, flagging an inefficient loop — that's the trivial part. The skill that actually separates reviewers people want feedback from is how the comment is phrased, because the same technical observation can land as helpful or as a status challenge depending entirely on wording.

## Separate the observation from the judgment

"This is wrong" and "this will throw if `items` is empty, want to add a guard?" point at the same bug, but only one of them describes the failure mode instead of passing verdict on the author. The first puts the reviewer above the author; the second puts both of them next to the same problem. Over many reviews, that difference compounds into either a relationship where people bring you their hardest problems or one where they route around you.

This isn't about softening technical standards. A serious bug should be flagged clearly and blocked from merging. The point is that clarity about the issue and generosity toward the person are not in tension — you can be direct about the bug while staying neutral about what it implies about the author.

## Distinguish blocking issues from preferences

Not every comment carries the same weight, and treating a stylistic preference with the same urgency as a security bug trains authors to either over-index on trivial feedback or, worse, start ignoring your comments wholesale because they can't tell which ones actually matter. Many teams adopt an explicit prefix convention — "blocking:", "nit:", "question:" — precisely so the author can triage a review in seconds instead of guessing at severity from tone alone.

Ask genuine questions rather than encoding a preference as a question. "Why not use a Set here?" read literally by someone under deadline pressure often gets answered literally, not received as the suggestion it was meant to be. If you want a change, say so; if you're actually curious about the reasoning, make sure your phrasing doesn't read as a disguised instruction.

## Praise specific things, not vague encouragement

"LGTM" and "nice work" cost nothing to write and teach the reader nothing about what was actually good. Calling out a specific choice — "the early return here makes the happy path a lot easier to follow" — does two things at once: it reinforces a pattern worth repeating, and it proves you actually read the code closely enough to notice it. Reviewers who only ever point out problems train authors to dread seeing their name in the review queue; reviewers who also name what's working build the kind of trust that makes the critical feedback land better too.

## Timing and volume matter as much as wording

A review with forty comments delivered six hours after submission reads very differently from the same forty comments split across two rounds with the biggest structural issues raised first. Front-load architectural concerns — the ones that might mean re-doing the approach — before nitpicking variable names, so the author isn't polishing code that's about to be rewritten. And when a review is going to carry a lot of feedback, a short synchronous conversation often resolves in ten minutes what would take three days of comment threads, without either side losing the thread of what actually needs to change.

The through-line across all of this is that code review feedback is a form of writing, and writing that's read by someone under time pressure and mild ego investment needs more care than an email to a peer. Getting the technical content right is necessary. It's the phrasing, sequencing, and evident respect for the author that determine whether the feedback actually changes the code.
