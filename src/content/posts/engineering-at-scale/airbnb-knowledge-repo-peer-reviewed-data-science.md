---
title: "Knowledge Repo: Airbnb's Answer to Reproducible Data Science"
slug: "airbnb-knowledge-repo-peer-reviewed-data-science"
description: "Why Airbnb's best analyses kept getting lost in personal notebooks, and how Knowledge Repo made data science writing peer-reviewed, searchable and reusable."
publishedAt: "2025-10-09"
category: "Airbnb"
tags:
  - Engineering at Scale
  - Airbnb
  - Data Science
  - Open Source
sources:
  - title: "Airbnb Engineering & Data Science"
    publisher: "Airbnb"
    url: "https://medium.com/airbnb-engineering"
---

A data scientist at a fast-growing company produces a steady stream of analyses: an experiment readout, a deep dive into why a metric moved, a one-off investigation for a product team. Most of that work has real, lasting value beyond the moment it was written — the same question tends to come up again months later, asked by someone who has no idea the earlier analysis exists. Airbnb ran into this squarely: valuable analyses lived in personal Jupyter notebooks, scattered Google Docs, or Slack threads, effectively invisible to anyone who didn't happen to be in the room when they were first shared, and impossible to verify or rerun later.

## Analyses as a graveyard, not a library

The core failure mode wasn't that people weren't doing good analytical work — it was that the work had no durable home. A notebook on someone's laptop or in a personal directory wasn't searchable by colleagues, had no review process to catch a subtly wrong join or a misleading chart, and often couldn't even be rerun by its own author a few months later once the underlying data or their environment had shifted. New analysts repeated investigations that had effectively already been done, because there was no way to discover that the answer already existed somewhere in the company.

## Publishing like code, not like a document

Airbnb's response, Knowledge Repo, treated data science write-ups the way engineering teams treat code: version-controlled in git, submitted for review through a pull-request-style workflow, and only published to a shared, browsable, searchable repository once reviewers with relevant expertise had signed off. Posts could be authored from Jupyter notebooks, R Markdown, or plain Markdown, which meant analysts could write in the tool they already used day to day rather than adopting a separate publishing format. The peer review step was the important part: it gave every published analysis a form of quality signal — someone besides the author had looked at the methodology and agreed it held up — the same trust mechanism code review provides for a codebase.

## Making past work findable

Once published, an analysis became a permanent, taggable, full-text-searchable artifact that anyone at the company could discover later, rather than something that existed only in the memory of whoever happened to see it shared the first time. This directly attacked the repeated-investigation problem: before starting a new deep dive, an analyst could search Knowledge Repo to see whether someone had already answered a similar question, and build on that work instead of starting from zero. Airbnb open sourced Knowledge Repo, and its underlying idea — treat data science writing with the same rigor, review, and durability engineering treats code — influenced how a number of other data-driven companies think about internal analytics documentation.

## What you can borrow

- If your best analyses live only in personal notebooks or ephemeral chat threads, you're paying a repeated cost every time someone reinvents work that already exists somewhere in the company.
- A lightweight peer review step before publishing an analysis catches real methodology errors and gives readers a trust signal, the same way code review does for production code.
- Let analysts write in the tools they already use — forcing a new authoring format for the sake of a publishing pipeline is a common reason internal knowledge-sharing tools go unused.
- Full-text search over past analyses is worth building deliberately; discoverability, not just storage, is what actually prevents duplicated work.
