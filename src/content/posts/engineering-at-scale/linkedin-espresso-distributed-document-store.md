---
title: "Espresso: The Document Store Behind LinkedIn's Member Data"
slug: "linkedin-espresso-distributed-document-store"
description: "Why LinkedIn built its own distributed document database to replace Oracle for online member data, and how it married timeline consistency with Kafka."
publishedAt: "2025-07-02"
category: "LinkedIn"
tags:
  - Engineering at Scale
  - LinkedIn
  - Databases
  - Distributed Systems
sources:
  - title: "Espresso: LinkedIn's Distributed, Timeline Consistent Document Store"
    publisher: "ICDE 2013"
    url: "https://engineering.linkedin.com"
---

For years, LinkedIn's primary online data store for member-facing features was a sharded Oracle deployment, and by the early 2010s it was straining under the site's growth. Oracle licensing costs scaled painfully with data volume, schema changes required careful coordinated migrations across shards, and the relational model didn't map naturally onto how product teams actually thought about data — as documents like a member's profile, a set of connections, or a stream of updates. LinkedIn built Espresso as a distributed, document-oriented database designed specifically for these online, low-latency, high-availability workloads, rather than trying to keep stretching a relational system built for a different era of the product.

## A document model with real secondary indexing

Espresso stores data as documents grouped into resources, similar in spirit to tables, with each document identified by a key and optionally sub-keyed for nested collections — a natural fit for something like "all the positions on a member's profile" or "all the comments on a post." Unlike a lot of first-generation NoSQL stores that gave up on anything beyond primary-key lookups, Espresso supported secondary indexes and simple relational-style querying within a partition, because LinkedIn's product teams genuinely needed to filter and sort, not just fetch by key. That put Espresso in an intentional middle ground: more flexible than a pure key-value store, but without taking on the full cost and complexity of distributed joins and transactions across partitions.

Storage was built on top of MySQL's InnoDB engine at the node level — Espresso didn't reinvent low-level storage, it added distribution, partitioning, routing, and replication on top of a proven local storage engine.

## Timeline consistency and Kafka as the replication backbone

Espresso's most distinctive design choice was making Kafka a core part of its own replication story rather than treating it as a purely external system. Every write to Espresso was captured as a change event and published to Kafka, which then served as the durable, ordered change stream used both for cross-datacenter replication and for feeding derived systems like search indexes and other downstream stores. This gave Espresso what LinkedIn called timeline consistency: replicas and derived views might lag the primary, but they applied changes in the same order the primary did, so consumers never saw updates out of sequence even if they saw them slightly late.

This mattered enormously for LinkedIn's broader architecture, since it meant new derived data systems didn't need to build their own bespoke change-capture mechanism against Espresso — they could just consume the same Kafka change stream that replication already relied on, reusing infrastructure that was going to exist anyway.

## Powering profile data and social features

Espresso became the online store behind core LinkedIn features including member profiles, InMail-style messaging metadata, and portions of the news feed's serving path, replacing significant swaths of the old Oracle footprint. It was built for the specific combination of requirements LinkedIn's product surface demanded: high write availability across data centers, predictable low latency for read-your-own-writes style interactions, and a schema-flexible document model that didn't require a full migration project every time a product team wanted to add a field.

## What you can borrow

- When a relational store's rigidity is the actual pain point, a document model with limited secondary indexing is often the right middle ground — not everything needs full joins, and not everything can live with pure key-value lookups either.
- Building local storage on a proven engine like InnoDB and adding distribution on top is usually less risky than writing a new storage engine from scratch.
- If you already run a durable ordered log for other purposes, use it as your change-data-capture backbone instead of building a separate replication mechanism per data store.
- "Timeline consistency" — ordered but possibly delayed — is a pragmatic middle ground between strict consistency and eventual consistency, and it's often what the product actually needs.
