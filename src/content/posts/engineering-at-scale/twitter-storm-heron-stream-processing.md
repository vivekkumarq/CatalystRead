---
title: "Storm to Heron: Rebuilding Twitter's Real-Time Stream Processor"
slug: "twitter-storm-heron-stream-processing"
description: "Why Twitter replaced Apache Storm with Heron, a re-architected stream processor with per-task process isolation and built-in backpressure."
publishedAt: "2025-09-22"
category: "Twitter"
tags:
  - Engineering at Scale
  - Twitter
  - Stream Processing
  - Real-Time Systems
sources:
  - title: "Twitter Heron: Stream Processing at Scale"
    author: "Sanjeev Kulkarni et al."
    publisher: "SIGMOD 2015"
  - title: "Twitter Engineering Blog"
    publisher: "Twitter"
    url: "https://blog.x.com/engineering"
---

Twitter's real-time infrastructure needed to process continuous streams of events — tweets, engagement signals, ad metrics — with results available in seconds, not after a batch job ran. Apache Storm, which Twitter acquired through BackType and open sourced in 2011, became the standard way to write these streaming jobs, expressed as topologies of spouts and bolts. As Storm usage spread across more teams and topologies at Twitter, though, its architecture started showing structural limits that no amount of tuning could fully fix.

## Where Storm's model broke down

Storm packed multiple independent tasks into shared worker JVM processes, which meant a resource-hungry or crashing task could degrade or take down unrelated tasks sharing its process. Debugging was painful for the same reason: logs from many logically separate tasks interleaved inside one process, making it hard to isolate what a single misbehaving piece of a topology was actually doing. Storm also had no real backpressure mechanism — if a downstream bolt fell behind, queues upstream could overflow, causing topologies to drop data or fail outright rather than degrade gracefully.

## Heron: same API, different internals

Twitter built Heron as a replacement that kept full compatibility with Storm's topology API, so existing topologies could move over largely unchanged, while re-architecting almost everything underneath. Each task ran as its own operating-system process instead of sharing a JVM with unrelated tasks, giving real resource isolation and making it possible to profile or inspect a single task without noise from the rest of the topology. A Topology Master coordinated each running topology, and Stream Managers handled data flow between containers while implementing backpressure directly, so a slow consumer would naturally throttle its producers instead of letting queues grow unbounded. This work was described in the SIGMOD 2015 paper "Twitter Heron: Stream Processing at Scale."

## Running on shared infrastructure

Rather than building its own cluster manager the way Storm had, Heron ran as a set of scheduled containers on Twitter's existing Mesos/Aurora infrastructure, the same shared scheduling layer used for long-running services and batch jobs elsewhere at the company. That let stream-processing workloads share hardware with everything else instead of requiring dedicated Storm clusters, and it meant Heron inherited Aurora's operational tooling — health checks, rolling restarts, resource quotas — instead of reimplementing equivalents inside the stream processor itself.

## Operational payoff

The practical effect showed up most in incident response. A single runaway task could be resource-capped or killed without threatening the rest of its topology. On-call engineers could attach a profiler to one process and get a clean signal instead of parsing interleaved logs from dozens of tasks. And backpressure removed a whole category of cascading failure where one slow bolt would eventually take an entire topology down. Heron became Twitter's standard real-time processing engine and was later released as open source.

## What you can borrow

- Give logically independent units of work their own process or container instead of packing many into one, even if it costs more overhead.
- Treat backpressure as a required design element in any streaming system, not something to add after the first outage.
- When replacing core infrastructure, preserve the existing API so callers don't have to rewrite against the new system.
- Make debuggability — clean logs, isolated profiling — a stated design requirement, not an incidental property.
- Run specialized workloads (like stream processing) on the same shared scheduler as everything else rather than standing up bespoke cluster management.
