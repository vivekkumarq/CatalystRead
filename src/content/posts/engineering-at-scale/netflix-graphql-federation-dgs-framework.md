---
title: "From Falcor to Federated GraphQL: Netflix's API Layer Grows Up"
slug: "netflix-graphql-federation-dgs-framework"
description: "Why Netflix moved its API layer from the homegrown Falcor model to federated GraphQL, and built the open-source DGS framework to get there."
publishedAt: "2026-02-11"
category: "Netflix"
tags:
  - Engineering at Scale
  - Netflix
  - GraphQL
  - API Design
sources:
  - title: "Netflix Technology Blog"
    publisher: "Netflix"
    url: "https://netflixtechblog.com"
  - title: "Domain Graph Service Framework (DGS)"
    publisher: "Netflix Open Source"
    url: "https://netflix.github.io"
---

Long before GraphQL was a mainstream choice, Netflix built its own solution to the same underlying problem: client applications running on wildly different devices — TVs, game consoles, phones, browsers — needed data shaped differently for each, and forcing every device team to work against a generic REST API meant either chatty multi-request client code or a proliferation of device-specific backend endpoints. Netflix's answer was Falcor, a JavaScript library and accompanying model for fetching data as if the entire backend were one virtual JSON object, letting clients request exactly the paths they needed. Falcor served Netflix well for years and was itself open sourced, but as Netflix's engineering organization and API surface kept growing, the model started showing real limits.

## Why Falcor stopped being enough

Falcor's model worked well when a relatively small, centralized team owned the API layer, but Netflix's growth pushed toward many independent teams each owning a piece of the overall data graph — content metadata, personalization, membership, studio production data — and Falcor didn't have a strong story for that kind of federated, multi-team ownership. GraphQL, by contrast, had matured into an ecosystem with strong tooling, a typed schema as a first-class concept, and — critically for Netflix's needs — an emerging federation model that let multiple independently deployed services each own a slice of one unified graph, with a gateway composing them into a single schema clients could query against.

That federation piece was the decisive factor. Netflix didn't just want GraphQL's query flexibility, it wanted the organizational property that came with federation: teams could own, develop, and deploy their part of the graph independently, without needing to coordinate schema changes through one central API team, which had increasingly become a bottleneck under the Falcor model.

## DGS: making federated GraphQL practical on the JVM

Much of Netflix's backend runs on the JVM, and existing GraphQL server tooling for Java and Kotlin didn't give teams the productivity and testing ergonomics Netflix wanted for building and running individual graph services at scale. So Netflix built and open sourced the Domain Graph Service framework (DGS), a Spring Boot–based framework for building GraphQL services with strong support for federation, code generation from schema definitions, and testing utilities designed for the reality of many teams each owning one federated service rather than one monolithic API.

DGS's schema-first approach — define the GraphQL schema, generate strongly typed data-fetcher interfaces from it — meant individual "domain graph service" teams could focus on implementing resolvers against a typed contract instead of hand-writing boilerplate GraphQL server plumbing repeatedly across dozens of services.

## A gradual migration, not a rewrite

Netflix didn't rip out Falcor overnight; the migration to GraphQL played out gradually, service by service and client by client, with both models coexisting for an extended period while teams migrated at their own pace. That's consistent with how Netflix has approached most major infrastructure transitions — Samza to Flink, Hystrix's retirement, Mesos to Kubernetes-style APIs for Titus — favor a long coexistence window and incremental migration over a risky, coordinated big-bang cutover across a company with hundreds of independently deployed services.

## What you can borrow

- Recognize when an API model that worked at a smaller organizational scale starts limiting you not technically but organizationally — that's a real signal to reconsider.
- Value federation-style ownership models when many independent teams need to contribute to one shared API surface without a central bottleneck team.
- Build or adopt strongly typed, schema-first tooling so ownership boundaries and contracts stay explicit as the API surface grows.
- Migrate incrementally with a long coexistence window for major API-layer changes rather than forcing a synchronized cutover across every client and team.
