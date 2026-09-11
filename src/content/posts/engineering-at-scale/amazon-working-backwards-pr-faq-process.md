---
title: "Working Backwards: How Amazon Writes the Press Release Before the Product"
slug: "amazon-working-backwards-pr-faq-process"
description: "Inside Amazon's PR/FAQ process, where teams write a mock press release and FAQ before writing code, and why engineers treat it as a real design tool."
publishedAt: "2025-12-18"
category: "Amazon"
tags:
  - Engineering at Scale
  - Amazon
  - Product Development
  - Engineering Culture
sources:
  - title: "Working Backwards: Insights, Stories, and Secrets from Inside Amazon"
    author: "Colin Bryar and Bill Carr"
    publisher: "St. Martin's Press, 2021"
---

Most product development starts from what a team already knows how to build and works forward toward a launch. Amazon's PR/FAQ process, documented in detail by former Amazon executives Colin Bryar and Bill Carr in their book "Working Backwards," deliberately runs that sequence in reverse. Before a team writes a line of code, or sometimes even before a project is formally approved, they write a mock press release announcing the finished product as if it already shipped, followed by a Frequently Asked Questions document that anticipates the hard questions a customer, a journalist, or a skeptical internal reviewer would ask. Only after that document survives scrutiny does the team move toward actually building anything.

## Forcing the customer benefit to exist on paper first

The press release section is deliberately short and written in plain language, with a strict internal norm against jargon or internal acronyms — the fictional customer reading it doesn't work at Amazon and doesn't care about the team's internal architecture. That constraint is the point: it's much harder to write a compelling, concrete press release for a feature than to build the feature, if the feature doesn't actually solve a real customer problem in a way you can describe simply. A team that finds itself struggling to write a clear, honest press release has usually discovered that early, on paper, rather than discovering it much later after months of engineering work went into something nobody asked for.

## The FAQ is where the hard tradeoffs get forced into the open

The FAQ section is where the PR/FAQ process earns its engineering credibility. It's split into questions a customer would ask and questions internal stakeholders would ask, and the internal half is expected to include the uncomfortable ones directly: what does this cost, what's the technical risk, what happens at ten times the expected launch volume, why would a competitor's existing product not already serve this need. Reviewers, often including senior leaders in Amazon's well-known meeting format, are expected to push on these questions, and the document gets rewritten — sometimes many times — until it can withstand that scrutiny. It's a way of finding the weakest part of a plan while a rewrite still costs an afternoon, not a rewrite of shipped software.

## Six-page narratives instead of slide decks

The PR/FAQ process is part of a broader Amazon norm against PowerPoint for significant decisions. Meetings that would elsewhere start with a slide presentation instead start with everyone silently reading a written narrative document — often up to six pages — for the first part of the meeting, before any discussion begins. The stated reasoning is that slides let a presenter paper over gaps in logic with bullet points and delivery, while full sentences and paragraphs force the author to actually resolve their argument's weak points before anyone else sees it, and let every reader engage with the same level of detail rather than whatever the presenter chose to say out loud.

## Working backwards as an engineering discipline, not just a writing exercise

What makes this relevant to engineering specifically, rather than just product management, is that a PR/FAQ commits a team to specific customer-facing outcomes before implementation choices get made, which changes what "done" means. An engineering team building toward a document that already promises "results in under a second" or "works offline" has a concrete target to design against from day one, instead of discovering acceptable performance or reliability bars late, after architecture decisions have already foreclosed some options.

## What you can borrow

- Write the announcement for a feature before building it — if you can't make the customer benefit clear and concrete in a few sentences, that's a signal worth heeding early.
- Force the hard questions (cost, risk, scale, "why not just use X") into a written document reviewed before any real work starts, not after.
- Prefer full written narratives over bullet-point decks for decisions that matter; prose exposes unresolved logic that slides can hide.
- Set concrete customer-facing targets before implementation begins, so architecture decisions get made against a real bar instead of being discovered after the fact.
