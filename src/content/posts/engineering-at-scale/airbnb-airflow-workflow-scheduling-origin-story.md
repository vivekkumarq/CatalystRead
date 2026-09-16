---
title: "How a Scheduling Problem at Airbnb Became Apache Airflow"
slug: "airbnb-airflow-workflow-scheduling-origin-story"
description: "Why cron and ad hoc scripts stopped working for Airbnb's data pipelines, and how the internal tool built to fix it became the industry-standard workflow scheduler."
publishedAt: "2025-06-24"
updatedAt: "2026-09-16"
category: "Airbnb"
tags:
  - Engineering at Scale
  - Airbnb
  - Data Engineering
  - Open Source
---

By 2014, Airbnb's data team was drowning in cron jobs. Nightly ETL scripts, experiment analysis pipelines, and reporting jobs had grown organically, each scheduled independently, each with its own retry logic and no shared visibility into whether upstream data was actually ready before downstream jobs ran. When something broke at 3 a.m., figuring out which of dozens of interdependent scripts had failed, and what to rerun, was mostly guesswork. Airbnb needed something that understood dependencies between jobs, not just their clock time.

## From cron to a directed graph

The core insight behind Airflow, started by Airbnb engineer Maxime Beauchemin, was to represent a data pipeline as a directed acyclic graph (DAG) of tasks rather than a list of independently scheduled scripts. A DAG made dependencies explicit: task B only runs after task A succeeds, and the scheduler — not a human staring at a crontab — is responsible for figuring out what's ready to run. Pipelines were defined in Python, which meant they could be generated programmatically, code-reviewed, versioned in the same repository as the rest of the codebase, and tested like any other code, instead of living as opaque cron entries on a server somewhere.

## Making failure a first-class citizen

A defining design choice was treating retries, backfills, and partial failure as normal, expected operations rather than exceptions to handle manually. Each task in a DAG could be configured with its own retry policy and timeout. If a pipeline needed to reprocess a week of historical data because an upstream schema changed, Airflow's backfill mechanism could replay the DAG for each historical date without hand-rolling scripts. This mattered because in a company running hundreds of interdependent pipelines, failure isn't rare — it's routine, and the tooling has to make recovering from it boring rather than a fire drill.

## From internal tool to Apache project

Airflow was open sourced by Airbnb in 2015 and entered the Apache Incubator in 2016, eventually graduating to a top-level Apache project. Its adoption outside Airbnb grew quickly because the problem it solved — scheduling and monitoring pipelines with real dependencies, in a UI that shows what succeeded, what failed, and why — was universal to any company doing serious data engineering, not something specific to Airbnb's domain. The web UI showing DAG runs as a grid, with color-coded task states over time, became a template that essentially every subsequent workflow orchestrator (Prefect, Dagster, and others) has answered to, one way or another.

## What broke when they scaled

The first generation of Airflow was a scheduler that still lived close to a single process and a relational metadata store. That worked while the DAG count was in the dozens. It strained when Airbnb accumulated hundreds of pipelines, each emitting state into the same metadata tables. Scheduler heartbeat lag, "zombie" tasks, and DAG-parse time that grew with Python import graphs became incidents.

The bottleneck is mechanical. The scheduler parses DAG files, compares the graph to stored task instances, and launches what is eligible. Slow parsing means importing Python instead of starting work. A retry storm after a warehouse outage can lock the same tables the UI needs. Later Airflow versions added HA schedulers and serialized DAGs so the webserver did not re-import every file; operators learned to treat the metadata database as production. The DAG idea stayed; the process model grew up around it. Once Airflow was the paved path, a noisy dynamic DAG could stall the scheduler for every team — pools, ownership, and parse-time SLAs became part of the design.

## A smaller-team version of the same idea

Model pipelines as a checked-in graph (Makefile, `needs:` in CI, a small Python DAG) instead of crons that "usually" finish in order. Put retries and an alert on edges that fail. Backfill only date-partitioned jobs you will actually rerun. When two teams share a scheduler, isolate parse and treat metadata like production.

## What you can borrow

- If your team's pipelines are chained through cron and tribal knowledge about run order, that's a strong signal you need an explicit dependency graph — modeling dependencies is what actually removes the 3 a.m. guesswork, not a nicer scheduler UI.
- Defining pipelines as code, not as configuration in a scheduler's UI, gets you code review, version history, and testability for free.
- Design for retries and backfills from day one. A pipeline tool that treats reprocessing historical data as an afterthought will get patched around with manual scripts, which recreates the exact problem you were trying to avoid.
- A good operational UI — one that shows task-level state across runs at a glance — pays for itself the first time something fails at an inconvenient hour.
