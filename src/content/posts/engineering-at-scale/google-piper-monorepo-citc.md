---
title: "Why Google Keeps Billions of Lines of Code in One Repository"
slug: "google-piper-monorepo-citc"
description: "Inside Piper and Client in the Cloud, the infrastructure that lets Google run a single monorepo at billions of lines of code without collapsing under its own weight."
publishedAt: "2026-04-02"
category: "Google"
tags:
  - Engineering at Scale
  - Google
  - Developer Tools
  - Version Control
sources:
  - title: "Why Google Stores Billions of Lines of Code in a Single Repository"
    author: "Rachel Potvin and Josh Levenberg"
    publisher: "Communications of the ACM, 2016"
    url: "https://cacm.acm.org"
---

Most engineering organizations that grow past a certain size split their codebase into many separate repositories, one common argument being that a single repository can't scale to a large company's commit volume, history size, and number of engineers touching it concurrently. Google took the opposite path deliberately, and has run essentially its entire codebase — Search, Ads, Gmail, internal infrastructure, nearly everything — as one enormous monorepo for decades, described by Rachel Potvin and Josh Levenberg in a widely cited 2016 Communications of the ACM article, "Why Google Stores Billions of Lines of Code in a Single Repository." Making that work at billions of lines of code and tens of thousands of engineers required infrastructure most companies never need to build, but the underlying reasoning is worth understanding even at far smaller scale.

## Piper: version control built for one repository, planet-wide

The repository itself is served by Piper, Google's internal version control system, distributed across data centers globally and backed by Bigtable for storage. A conventional version control system like Git assumes engineers clone the full repository (or at least a full history) locally; at Google's monorepo size that assumption breaks down completely, so Piper is designed around remote access to a centrally-hosted repository rather than local full clones, with access control enforced per-directory so different teams' code can carry different visibility and review requirements within the same repository.

## CitC: workspaces without the wait

Client in the Cloud, CitC, is the workspace layer that makes working against a repository that large practical for an individual engineer. Instead of checking out a local copy of relevant files, CitC gives each engineer a workspace backed by cloud storage, where unmodified files are represented virtually rather than copied to local disk, and only files the engineer actually edits get materialized as real local changes. This means starting work on any part of the repository, no matter how large, doesn't require locally copying gigabytes of files you're not touching — your workspace is effectively lazy, resolving to the underlying repository state for anything you haven't changed.

## The tradeoff: tooling investment for organization-wide benefits

Google's argument for the monorepo centers on a few concrete advantages: a single, unambiguous version of the truth for what "the current state of any given library" is, so there's no dependency-versioning drift between teams each pinned to different revisions of shared code; the ability to do atomic, cross-project changes in one commit (rename a widely-used function and update every caller across the company simultaneously); and full visibility for code search and large-scale refactoring tools across the entire codebase rather than across whatever subset of repos a tool happens to have access to. The tradeoff is that none of this works without heavy investment in tooling — Piper, CitC, Blaze/Bazel for builds, and large-scale automated refactoring tools all exist specifically because a naive monorepo without that infrastructure would grind to a halt.

## What you can borrow

- A monorepo's benefits (single source of truth, atomic cross-cutting changes, unified code search) are real, but they only pay off if you invest proportionally in tooling — don't adopt the structure without the infrastructure.
- Per-directory or per-path access control lets you keep a single repository while still enforcing different review and visibility policies for different parts of the codebase.
- Virtual, lazily-materialized workspaces (CitC's approach) are worth considering any time your repository is too large for engineers to comfortably clone in full.
- Cross-cutting atomic changes are a genuine productivity advantage worth weighing against the operational simplicity of many small repositories.
- Whichever model you choose, be honest about what breaks at your actual scale — the right answer for a ten-person team and a ten-thousand-engineer company are legitimately different.
