---
title: "Side Projects That Actually Teach You Something"
slug: "side-projects-that-actually-teach-you-something"
description: "Most side projects stall at the same 'CRUD app with auth' stage that taught you everything it's going to — how to pick one that keeps teaching you."
publishedAt: "2025-06-11"
category: "Career"
tags:
  - Career
  - Side Projects
  - Professional Growth
  - Software Engineering
---

Most engineers have started the same side project at least once: a CRUD app with user authentication, wired up to a database, deployed somewhere. It's a genuinely useful exercise the first time. The problem is how often it gets repeated in a new framework as "a new project" without actually teaching anything new the second or third time around, because the hard parts — the parts that would generate real learning — were never in scope to begin with.

## Pick a project with a constraint you don't already know how to satisfy

A side project teaches you something specific to the degree that it forces you to solve a problem you don't already have a comfortable answer for. "Build a todo app" doesn't have that property for anyone with a few years of experience — every decision in it is one you've made before, which is exactly why it's a good beginner project and a poor choice for someone past that stage. A project that has to handle a genuinely large amount of data, or needs to work correctly when two users edit the same thing at once, or has a hard real-time requirement, forces decisions you haven't already made on autopilot.

This doesn't require an exotic idea. A recipe-sharing app is uninteresting as a concept and can still be an excellent learning project if you deliberately design it around a constraint you want to learn — building it to handle offline editing with conflict resolution when connectivity returns teaches you something real about distributed state, regardless of how unoriginal the underlying app idea is. The constraint is doing the teaching, not the premise.

## Choose something you'll actually keep using

The gap between a project you use and a project you built and abandoned is where most of the real learning lives, because using something regularly surfaces the problems that only show up under sustained, honest use — the edge case you didn't think of, the workflow that's technically correct but annoying every single time, the performance problem that only appears once there's real data in it instead of three seed rows. A project you stop touching after the initial build never gets far enough to teach you any of that.

This is also why a project solving a real, specific annoyance in your own life tends to outperform a project chosen purely because it sounded impressive on a resume. You'll actually open it again in three weeks, hit a rough edge, and be motivated to fix it properly instead of leaving it broken, because it's currently bothering you.

## Finish the boring parts too

The unglamorous half of a project — deployment, monitoring, handling the error cases that only show up in production, dealing with a dependency update that breaks something — teaches a different and, for most engineers' day jobs, more directly applicable set of skills than the interesting core logic did. It's also the half that gets skipped constantly, because building the exciting part is more fun than deploying and operating a boring service. A project that never gets deployed never teaches you anything about what actually breaks once real traffic, real users, or real time passes hit it, which is precisely the category of problem that's hardest to learn about any other way.

The projects that end up genuinely useful on a resume or in an interview aren't usually the most technically ambitious ones — they're the ones the person can talk about in specific, first-hand detail: what broke, what they changed, what they'd do differently next time. That level of detail only comes from a project that ran long enough, and real enough, to actually go wrong at least once.
