---
title: "DOMA: Taming Microservice Sprawl With Domain Boundaries"
slug: "uber-doma-domain-oriented-microservices"
description: "How Uber's Domain-Oriented Microservice Architecture organized thousands of services into gateways and layers after sprawl made the old model unmanageable."
publishedAt: "2025-06-11"
updatedAt: "2026-09-16"
category: "Uber"
tags:
  - Engineering at Scale
  - Uber
  - Microservices
  - Architecture
sources:
  - title: "Uber Engineering Blog"
    publisher: "Uber"
    url: "https://www.uber.com/blog/engineering/"
---

Uber's engineering organization grew, famously, into thousands of microservices — a consequence of a culture that encouraged teams to spin up new services quickly rather than route around a monolith. That approach solved the original problem, letting small teams ship independently without waiting on a central codebase, but it created a new one: a service graph so large and tangled that understanding which services depended on which, where a domain concept like "trip" or "rider" was actually owned, and how to make a cross-cutting change safely became genuinely difficult. Uber's response was DOMA — Domain-Oriented Microservice Architecture — a set of organizing principles for grouping services by business domain rather than letting the graph grow unstructured.

## Domains, layers, and gateways

DOMA's core idea is to explicitly group related microservices into domains that map to business concepts, and then organize each domain internally into layers with distinct responsibilities: an edge or gateway layer that other domains and external callers actually talk to, and internal layers behind it that do the domain's real work but aren't meant to be called directly by outsiders. That gateway pattern matters because in an unstructured microservice graph, any service can end up calling any other service's internals directly, and untangling that later — or safely refactoring an internal service — becomes nearly impossible once enough of the organization depends on undocumented internal behavior.

By funneling cross-domain calls through a defined gateway, a domain's internal services are free to be refactored, split, merged, or reimplemented without breaking callers elsewhere in the company, as long as the gateway's contract holds. That's a familiar principle from good API design applied at the scale of an entire service-oriented organization rather than a single service.

## Why this mattered more at Uber's scale than most

Smaller engineering organizations with tens of services can often keep a mental map of the whole system, or at least their neighborhood of it, without formal domain boundaries. Uber's scale made that impossible — a new engineer, or even a tenured one working outside their usual area, had no practical way to know which of thousands of services legitimately owned a piece of business logic without either an org chart lookup or archaeology through call graphs. DOMA gave the organization a shared vocabulary: domains as the unit of ownership, gateways as the unit of controlled access, which made both technical reviews and organizational questions ("who owns trip cancellation logic?") answerable in the same terms.

## A migration, not a rewrite

Uber didn't rebuild its service graph from scratch to adopt DOMA — the existing thousands of services had to be regrouped and given gateways incrementally, domain by domain, while the business kept shipping. That incremental nature is part of why DOMA is presented as an architecture pattern and set of principles rather than a specific piece of software: the value was in the organizing discipline it imposed on already-sprawling infrastructure, applied gradually across teams that each had to buy in and do the regrouping work themselves.

## What a mid-size team can steal from DOMA

DOMA was Uber's attempt to cluster microservices into domains so the org did not drown in a mesh of tiny repos. The failure mode of microservices without domains is a change that needs twelve PRs and an undocumented call graph. Mid-size steal: few domains with clear owners and APIs, even if each domain is still a modular monolith.

The concrete failure mode is a "domain" that is a rename of a team with the same leaky RPCs inside. Another is a shared kernel library that becomes a distributed monolith via version pinning hell. Operational gotcha: data ownership. If every service still writes the trips table, you did not domain the data. Pick a source of truth per concept. Uber had hundreds of services; that was the disease DOMA treated. If you have eight, do not split them to look like Uber. Steal the language: bounded contexts, published events, no drive-by PRs into another domain's store. Cross-domain features go through a workflow, not a join. On-call should map to domains, or you will page the wrong people. The org change only works if architecture review can reject a new service that belongs inside an existing domain. Otherwise DOMA is a slide, and the graph keeps growing.

## What you can borrow

- Microservice sprawl is a predictable outcome of low-friction service creation; plan a domain-grouping strategy before the graph gets too large to reorganize cheaply.
- A gateway layer per domain lets internal services evolve freely — insist that cross-domain calls go through a defined contract, not directly into another domain's internals.
- Domain boundaries should map to business concepts your organization already reasons about, so the architecture and the org chart use the same vocabulary.
- You can retrofit structure onto sprawl incrementally, domain by domain, without a company-wide rewrite — but it does require sustained organizational buy-in, not just a design doc.
