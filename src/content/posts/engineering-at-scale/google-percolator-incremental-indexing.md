---
title: "Percolator: How Google Killed the Full Web Recrawl"
slug: "google-percolator-incremental-indexing"
description: "How Google's Percolator system replaced batch MapReduce reindexing with incremental, transactional updates and cut search index latency dramatically."
publishedAt: "2025-11-14"
updatedAt: "2026-09-16"
category: "Google"
tags:
  - Engineering at Scale
  - Google
  - Distributed Systems
  - Data Engineering
sources:
  - title: "Large-scale Incremental Processing Using Distributed Transactions and Notifications"
    author: "Daniel Peng and Frank Dabek"
    publisher: "OSDI 2010"
    url: "https://research.google"
---

For years, Google's search index was built the way MapReduce was designed to build things: in large batch passes over the entire web crawl, producing a new index from scratch each time. That approach worked, but it had a structural limitation that had nothing to do with implementation quality — a batch job that reprocesses everything scales its latency with the size of the entire corpus, not with the size of what actually changed. As the web grew and Google wanted fresher search results, rebuilding the whole index to reflect a small fraction of updated pages became an increasingly bad trade: enormous compute spent mostly reprocessing pages that hadn't changed, just to surface the small number that had. Percolator, described in the 2010 OSDI paper "Large-scale Incremental Processing Using Distributed Transactions and Notifications" by Daniel Peng and Frank Dabek, was Google's answer: convert index updates from a batch problem into an incremental one.

## Transactions on top of Bigtable

Percolator's core contribution was adding multi-row, distributed ACID transactions on top of Bigtable, which by itself only offered single-row atomicity. That sounds like a narrow technical addition, but it unlocked a completely different way of thinking about the indexing pipeline: instead of a MapReduce job sweeping over the entire dataset, individual documents could be updated transactionally and independently, with correctness guarantees around updates that touched multiple pieces of related data (a page and its outbound links, for instance) even though they lived in different Bigtable rows.

Percolator used a two-phase commit protocol layered over Bigtable, with timestamps to implement snapshot isolation — readers see a consistent snapshot of the data without blocking writers, and writers commit only after acquiring locks on all rows they touch. This gave application code the transactional guarantees engineers expect from a traditional database, on top of infrastructure that was built for massive scale rather than transactional correctness.

## Observers: computation triggered by change, not by schedule

The second piece was a notification framework built around "observers" — pieces of code registered to run automatically whenever a particular column in Bigtable changed. Instead of a scheduled batch job asking "what changed since last time," Percolator inverted the model: a write to a tracked column triggered the relevant downstream computation directly, cascading through however many dependent updates were needed. Indexing a newly crawled page could trigger link-graph updates, which could trigger relevance recalculations for affected pages, all driven by data changes rather than by a periodic full sweep.

Google reported that moving from the batch MapReduce indexing pipeline to Percolator reduced the average age of documents in Google's search index dramatically — from the batch pipeline's multi-day cycle down to a matter of minutes — at roughly comparable overall resource cost, since Percolator's incremental work scaled with what actually changed rather than the size of the whole web.

## What broke when they scaled

MapReduce could rebuild a search index, but the latency of a full pass became the freshness of the web. Percolator (OSDI 2010, Peng and Dabek) layered snapshot-isolated transactions and observers on Bigtable so a crawled page could trigger incremental work — link graph, index postings — without rerunning the world. The scaling break of batch-only indexing is multi-day staleness; the scaling break of naive per-document updates is write storms and inconsistent derived views.

Percolator's timestamps, locks in Bigtable columns, and worker-driven observers are a specific protocol, not "just use a queue." Failed observers must not leave the index half-updated. Google later systems (and the industry's stream processors) chase the same idea with different APIs. The paper's famous result was a large drop in average document age in the index versus the MapReduce pipeline.

## A smaller-team version of the same idea

When a row changes, enqueue a job to update derived data; use a transactional store if those updates must be atomic. Do not rebuild the whole search index nightly if only 1% of documents changed. Kafka + a worker is Percolator-shaped. True Percolator-on-Bigtable is for when you already have Bigtable.

## What you can borrow

- Ask whether your batch pipeline's cost is scaling with total data size or with the amount of actual change — if it's the former, incremental processing triggered by writes is often the fix.
- Layering transactional guarantees on top of a scalable but weakly-consistent store (as Percolator did with Bigtable) can be cheaper than switching to a fully transactional database.
- An observer/trigger model — compute reacts to data changes rather than running on a fixed schedule — reduces both latency and wasted work compared to periodic full recomputation.
- Snapshot isolation lets readers avoid blocking on in-flight writes, which matters enormously once your system has many concurrent transactional updates.
- Incremental architectures trade implementation complexity (locks, timestamps, cascading triggers) for latency — worth it only once staleness is actually costing you something measurable.
