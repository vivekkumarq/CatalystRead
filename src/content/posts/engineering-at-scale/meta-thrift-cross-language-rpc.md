---
title: "Thrift: Cross-Language RPC Before gRPC Existed"
slug: "meta-thrift-cross-language-rpc"
description: "How Facebook's Thrift let services written in different languages call each other efficiently, years before gRPC popularized the same idea."
publishedAt: "2025-10-05"
updatedAt: "2026-09-16"
category: "Meta"
tags:
  - Engineering at Scale
  - Meta
  - Distributed Systems
  - Infrastructure
sources:
  - title: "Thrift: Scalable Cross-Language Services Implementation"
    author: "Mark Slee, Aditya Agarwal, and Marc Kwiatkowski"
    publisher: "Facebook, 2007"
    url: "https://research.facebook.com"
---

By the mid-2000s, Facebook's backend was no longer a single monolithic codebase written in one language. Different teams reached for different languages for different jobs — PHP on the web-facing side, C++ where raw performance mattered, Java and Python elsewhere — and those services needed to call each other constantly. The problem wasn't any single language; it was that none of the existing options made cross-language calls both efficient and easy to maintain as the number of services and languages multiplied. Hand-writing a client and server stub for every language pair that needed to talk to every other language pair simply didn't scale past a handful of services.

## A single interface definition, many generated languages

Thrift's core idea was to describe a service's interface once, in a small interface definition language (IDL), and generate client and server code for many target languages from that single definition. An engineer would write a `.thrift` file describing the data structures and available remote calls, and Thrift's code generator would produce matching, type-safe bindings in C++, Java, Python, PHP, and others. This meant a service's interface only had to be defined and maintained in one place, and every language that needed to call it got an automatically generated, consistent client — removing an entire category of hand-written, drift-prone glue code between services.

```thrift
struct User {
  1: i64 id,
  2: string name,
}

service UserService {
  User getUser(1: i64 id),
}
```

## A binary protocol built for efficiency, not readability

Unlike text-based formats such as XML or JSON that were common for RPC at the time, Thrift defaulted to a compact binary wire protocol, trading human readability for smaller payloads and faster serialization and deserialization — both of which mattered directly at Facebook's request volume, where the cost of encoding and moving data across the network was a real, measurable expense multiplied across an enormous number of internal calls. Thrift also separated the wire protocol from the transport layer, so the same generated interface code could run over different underlying transports (sockets, framed buffers) depending on what a given service needed, without regenerating client code.

## An idea that later defined an entire category

Facebook open sourced Thrift in 2007 and donated it to the Apache Software Foundation, where it continued to be developed independently of Facebook's own internal fork. The core idea — a language-neutral interface definition, generated stubs, and an efficient binary protocol — later became the standard shape of the entire cross-language RPC category, most visibly in Google's gRPC, which combined a similar IDL-and-codegen approach with HTTP/2. Thrift's early bet, that services at scale would routinely be written in different languages and that interface generation was the only sane way to keep them talking to each other reliably, turned out to be exactly right.

## Operational gotchas of a polyglot RPC stack

Thrift solved Facebook's mix of C++, Java, Python, and PHP talking without ad-hoc JSON. The failure mode today is two IDL ecosystems — Thrift and proto — plus hand-rolled REST, so you paid the polyglot tax three times. Mid-size steal: one IDL, generated stubs, and a ban on editing generated code. gRPC is fine; the lesson is the contract, not the Facebook logo.

Operational gotcha: backwards compatibility of structs. Adding a required field, reusing field ids, or changing a type in place breaks old binaries that stay on hosts for weeks. Steal additive optional fields and a compatibility test in CI that deserializes golden payloads from the last two versions. Timeouts and connection pooling differ per language binding; Python clients will behave unlike C++ clients under the same IDL, so load tests must include each caller. Another trap is using RPC for what should be a message bus: fan-out to twenty Thrift services in a user request creates a latency lottery. Thrift does not include a distributed trace by default; without one you cannot see which downstream ate the budget. Mid-size teams should standardize deadlines, error codes, and auth on the first RPC framework they pick. Replacing Thrift later is a multi-year tax Facebook could absorb. You should pick once, then be boring.

## What you can borrow

- Define a service's interface once, in a language-neutral schema, and generate client and server bindings from it — hand-maintaining parallel clients in multiple languages is a maintenance cost that grows with every new language and every interface change.
- A binary wire protocol trades debuggability for real gains in payload size and (de)serialization speed; that trade is worth making once RPC volume is high enough for the difference to show up in your infrastructure bill.
- Separating the interface definition, the wire protocol, and the transport layer lets you change one without forced changes to the others — a form of decoupling that pays off as a system's transport needs diversify.
- Betting on multi-language interoperability early, even before it's your biggest pain point, tends to be cheaper than retrofitting it after dozens of services and language choices have already calcified.
