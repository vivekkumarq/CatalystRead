---
title: "Superset: From Airbnb Hackathon Project to Apache Top-Level Project"
slug: "airbnb-superset-hackathon-to-apache-project"
description: "How a weekend hackathon tool for exploring data at Airbnb grew into Apache Superset, one of the most widely used open source BI platforms."
publishedAt: "2025-05-14"
category: "Airbnb"
tags:
  - Engineering at Scale
  - Airbnb
  - Data Visualization
  - Open Source
sources:
  - title: "Superset"
    publisher: "Apache Software Foundation"
    url: "https://superset.apache.org"
  - title: "Airbnb Engineering & Data Science"
    publisher: "Airbnb"
    url: "https://medium.com/airbnb-engineering"
---

Airbnb's data team had a familiar problem: dashboards were being built one-off, in whatever tool an individual analyst preferred, with no shared way for someone else to explore the same data without writing new SQL from scratch. Licensed BI tools existed, but they were often expensive to scale across a growing company, slow to extend, or a poor fit for the kind of ad hoc, exploratory slicing and dicing that data scientists actually wanted to do. The tool that eventually solved this for Airbnb started, notably, as a weekend hackathon project rather than a planned platform investment.

## A hackathon project with a clear itch to scratch

The project, built by Airbnb engineer Maxime Beauchemin — who also created Apache Airflow — began under the name Panoramix, aimed at letting anyone at the company explore data visually without needing to write SQL for every question. The core idea was a drag-and-drop interface backed by a semantic layer: define a dataset once, with its metrics and dimensions, and let users build charts and slice data against it interactively rather than hand-writing a new query for every variation of a question. That combination — fast exploration plus a reusable semantic layer — is what separated it from a simple SQL notebook.

## Renamed twice, adopted widely

The project was renamed Caravel after a trademark conflict with the original name, and later renamed again to Superset. Internally at Airbnb it kept growing in scope: support for a wide range of SQL-speaking databases through SQLAlchemy, a large library of chart types, role-based access control, and caching layers to keep dashboards responsive even as query volume grew. What made it stand out from many internal tools was that the problem it solved — self-service data exploration and dashboarding for a large SQL-literate but not necessarily engineering-heavy user base — was common to essentially every data-driven company, not unique to Airbnb's domain.

## From internal tool to Apache Software Foundation project

Airbnb open sourced Superset and it entered the Apache Incubator in 2017, eventually graduating to a top-level Apache Software Foundation project in 2021. That governance shift mattered in practice: instead of a single company's roadmap and priorities determining the tool's direction, a broader community of contributors and committers — from companies well beyond Airbnb — took ownership of its evolution, review process, and release cadence. This is the same open source trajectory Airbnb's Airflow took a few years earlier, and it reflects a recurring pattern in Airbnb's data infrastructure: internal tools built to solve a real, unglamorous operational problem tend to generalize well precisely because the underlying problem — scheduling pipelines, exploring data, visualizing metrics — isn't specific to any one company's business.

## What you can borrow

- A tool built to scratch a real, specific internal itch — not designed top-down as a platform — is often a better foundation than something architected in the abstract, because every early feature is grounded in an actual use case.
- A semantic layer that decouples "what a metric means" from "how to visualize it" lets non-engineers explore data safely without regenerating the same governance problems ad hoc SQL creates.
- If your internal tool solves a genuinely common problem, consider whether open sourcing it is a lower-cost way to get a broader contributor base than growing your own team to build every feature yourselves.
- Expect a name to need to change; trademark conflicts are common enough for popular open source projects that it's worth not getting attached to the first name you pick.
- Self-service tooling only reduces bottlenecks if it's actually faster than the workaround — SQL scripts or a licensed BI seat — so invest in making the common case fast before adding breadth of features.
