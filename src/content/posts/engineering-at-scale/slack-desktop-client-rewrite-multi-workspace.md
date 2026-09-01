---
title: "Rewriting the Slack Desktop Client for a Multi-Workspace World"
slug: "slack-desktop-client-rewrite-multi-workspace"
description: "How Slack rebuilt its Electron desktop app's architecture to support switching between many workspaces without the memory and performance problems piling up."
publishedAt: "2025-08-08"
category: "Slack"
tags:
  - Engineering at Scale
  - Slack
  - Desktop Applications
  - Electron
---

Slack's desktop app is built on Electron, which let the team ship a cross-platform client from a shared web codebase rather than maintaining separate native applications for macOS, Windows, and Linux. That choice paid off early, but as Slack usage patterns evolved — users increasingly belonging to and actively switching between many workspaces, sometimes dozens for consultants, open-source maintainers, or people at large multi-team organizations — the desktop app's original architecture started showing real strain. Each workspace was effectively running as its own fairly independent instance within the app, which meant memory usage scaled roughly linearly with the number of workspaces a user had open, and switching between workspaces carried real, user-visible overhead.

## The cost of treating each workspace as its own world

In the original architecture, a lot of what a workspace needed — its own rendering context, its own copies of shared UI components, its own in-memory caches of channel and message data — was duplicated per workspace rather than shared across them. For a user with a handful of workspaces this was a manageable, if wasteful, trade-off. For power users with many workspaces, the cumulative memory footprint became a genuine performance problem, and it showed up in exactly the way users notice most: the app feeling sluggish, workspace switches feeling slow, and overall resource consumption creeping up over the course of a long working day with many workspaces open across the day.

## Sharing infrastructure across workspace instances

Slack's rework focused on identifying what genuinely needed to be workspace-specific versus what could be shared across all the workspaces a user had open at once. Core application shell infrastructure, shared UI chrome, and common rendering machinery moved toward being shared once across the whole app rather than duplicated per workspace, while workspace-specific state — the actual channel and message data, notification state, presence for that workspace's members — stayed properly isolated so that one workspace's data never leaked into another's view.

```
before: [workspace A: full stack] [workspace B: full stack] [workspace C: full stack]
after:  [shared app shell / rendering infra]
              |         |         |
        [workspace A]  [workspace B]  [workspace C]  (workspace-specific state only)
```

This is a familiar pattern in application architecture more broadly — separating what's genuinely per-tenant from what's shared platform infrastructure — but executing it inside an existing, shipping Electron application with millions of active users required doing it incrementally and validating along the way that no workspace's data or behavior leaked into another's, since a bug in that isolation would be a serious cross-tenant data problem, not just a performance regression.

## Measuring what actually mattered to users

Part of the effort involved building better internal tooling and metrics to understand what desktop performance actually looked like for real users with real workspace counts, rather than relying on synthetic benchmarks with one or two workspaces that didn't represent how heavy users actually worked. Startup time, memory footprint as workspace count grew, and the latency of switching between workspaces all needed to be measured against real usage distributions, since the whole point of the rework was improving the experience specifically for the users whose workflows had outgrown the original design's assumptions.

## What you can borrow

- When a per-tenant (or per-workspace, per-account) architecture starts costing you linearly in memory or startup time, look for what's genuinely tenant-specific versus what can be shared platform infrastructure.
- Electron and similar cross-platform frameworks are a legitimate choice for shipping fast across platforms, but their resource model needs deliberate architecture as usage patterns diversify beyond what you originally designed for.
- Isolate tenant-specific state carefully when consolidating shared infrastructure — a performance optimization that leaks one tenant's data into another's view is a much worse outcome than the performance problem it was meant to fix.
- Benchmark against your actual heavy-usage distribution, not a synthetic light-usage case — the users most affected by a scaling problem are exactly the ones a small benchmark tends to miss.
