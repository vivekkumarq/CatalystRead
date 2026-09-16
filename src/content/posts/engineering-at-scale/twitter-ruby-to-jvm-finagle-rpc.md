---
title: "From Ruby to the JVM: Twitter's Finagle Bet"
slug: "twitter-ruby-to-jvm-finagle-rpc"
description: "Why the Fail Whale era pushed Twitter off a Ruby on Rails monolith toward JVM services and Finagle, its shared asynchronous RPC framework."
publishedAt: "2025-06-24"
updatedAt: "2026-09-16"
category: "Twitter"
tags:
  - Engineering at Scale
  - Twitter
  - JVM
  - Service Architecture
---

In Twitter's early years, the whole product ran on a Ruby on Rails monolith, and as the site's growth accelerated it became infamous for a very visible failure mode: the Fail Whale, the error page users saw when the site simply couldn't keep up with load. Some of that was growing-pains architecture rather than anything specifically wrong with Ruby, but Twitter's engineers concluded that the combination of MRI Ruby's threading model and the operational overhead of scaling a single monolithic Rails application to Twitter's traffic wasn't going to get them where they needed to go. The response was a multi-year migration off the Rails monolith toward a service-oriented architecture running on the JVM, with the tweet timeline (the single hottest path in the product) among the first major pieces to move.

## Choosing the JVM for its runtime maturity

Twitter's engineers were explicit that the move wasn't really "Ruby is bad" so much as "we need a runtime with mature, battle-tested support for the concurrency and performance characteristics our traffic requires." The JVM offered a highly optimized just-in-time compiler, mature concurrency primitives, and — crucially — a large ecosystem of libraries and operational tooling that made it practical to build many independent services rather than one large application. Twitter adopted Scala as the primary language for new backend services, valuing its combination of JVM performance with a more expressive, functional-friendly syntax than Java offered at the time, while plenty of infrastructure continued to be written in Java itself.

The Search team's migration of query serving off of a MySQL-backed Ruby stack onto a JVM-based system built with Lucene was one of the earliest visible wins, demonstrating the kind of latency and throughput improvement that made the broader migration case for the rest of the company.

## Finagle: one RPC library instead of many

As Twitter split into more and more independent services, it faced the same problem every company hits at that stage: every service-to-service call needs connection pooling, load balancing, retries, timeouts, and failure handling, and if each team builds that independently you get inconsistent, buggy networking code duplicated across the whole company. Twitter built Finagle as a shared, asynchronous RPC library to solve this once, on top of Netty's asynchronous networking layer, using Scala's `Future` abstraction to represent asynchronous, composable operations cleanly instead of forcing engineers into callback-heavy code.

Finagle bundled in the operational patterns that matter at scale as defaults rather than opt-ins: client-side load balancing across service instances, automatic retries with backoff, circuit-breaking style failure accrual that stopped sending traffic to a struggling instance, and consistent distributed tracing across service boundaries. Because every service built on Finagle got these behaviors uniformly, an engineer calling into an unfamiliar service could reason about its failure behavior without reading its implementation — the framework's defaults told the story.

```
client --Future[Response]--> Finagle (load balancing, retries, tracing) --> service instances
```

## A migration measured in years, not sprints

The move away from the Rails monolith wasn't a rewrite executed in one push — it played out over several years, service by service, with the monolith and new JVM services coexisting and communicating throughout the transition. That incremental approach let Twitter validate the new stack's reliability and performance on individual high-value paths like search and the timeline before betting the entire product on it, rather than committing to a big-bang cutover with no fallback.

## What a mid-size team can steal from Finagle and the JVM move

Twitter moved hot paths from a Ruby monolith toward JVM services talking Finagle RPC, because the VM and the RPC library gave them timeouts, connection pooling, and load balancing as defaults. Mid-size steal: a single RPC client with deadlines and metrics, even if you stay on one language. Do not rewrite in Scala to get a timeout.

The concrete failure mode is a strangler that never strangles: the Ruby app becomes a slow router to JVM services, adding a hop and a failure mode. Another is Finagle-like retries on non-idempotent posts. Operational gotcha: thread pools. JVM services fail by queueing; Ruby failed by being slow. You will need bounded queues and rejection. Polyglot debugging without trace propagation is a maze. Put a trace id on the first Ruby request and carry it. Hiring and local dev cost of a mixed estate is real; freeze the number of languages. Twitter's Finagle is now a historical teacher for gRPC + a resilience layer. Use the teacher. If the monolith's problem is N+1 queries, the JVM will happily N+1 faster. Profile first. The steal is RPC as a library with opinions, and a measured extraction of a hotspot, not an identity change from Ruby to the JVM.

## What you can borrow

- A slow service is often a resourcing and architecture problem more than a language problem — but a runtime mismatch at your specific scale is a legitimate reason to change ecosystems.
- When you split into many services, build (or adopt) one shared RPC layer with sane defaults for retries, load balancing, and tracing — don't let every team reinvent networking resilience independently.
- Migrate the highest-value, highest-pain path first to prove the new stack under real load before committing the rest of the company to it.
- An incremental, service-by-service migration that lets old and new systems coexist is usually safer than a big-bang rewrite, even if it takes longer.
