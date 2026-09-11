---
title: "Protocol Buffers, Stubby, and the Road to gRPC"
slug: "google-protocol-buffers-stubby-grpc"
description: "How Google's internal Protocol Buffers serialization format and Stubby RPC framework evolved into gRPC, the open-source RPC standard many companies now run on."
publishedAt: "2026-06-30"
category: "Google"
tags:
  - Engineering at Scale
  - Google
  - RPC
  - Developer Tools
sources:
  - title: "gRPC Documentation"
    publisher: "gRPC"
    url: "https://grpc.io"
  - title: "Protocol Buffers Documentation"
    publisher: "Google"
    url: "https://protobuf.dev"
---

Once Google's architecture became genuinely service-oriented, with thousands of internal services calling each other constantly, two unglamorous but foundational questions had to be answered the same way everywhere: how do services serialize structured data to send to each other, and how do they actually make the remote call. Answering those questions inconsistently across teams, everyone picking their own serialization format and RPC mechanism, would have made every cross-team integration its own small negotiation. Google's answer was to standardize both, early and company-wide: Protocol Buffers for serialization, and an internal RPC framework called Stubby for the calls themselves. Decades later, the open-source descendant of that pairing, gRPC, is a widely used industry standard.

## Protocol Buffers: a schema-first alternative to JSON and XML

Protocol Buffers, "protobuf," is a language-neutral, schema-first serialization format: you define a message's structure in a `.proto` file, and Protocol Buffers' compiler generates code in whatever language you're using to serialize and deserialize that message efficiently. Compared to text formats like JSON or XML, protobuf's binary encoding is significantly smaller on the wire and faster to parse, which matters enormously when you're making an enormous volume of internal RPCs between services.

```protobuf
message SearchRequest {
  string query = 1;
  int32 page_number = 2;
  int32 result_per_page = 3;
}
```

Just as important as the performance win was the schema itself as a contract: because both sides of an RPC generate code from the same `.proto` definition, adding new fields to a message can be done in a backward- and forward-compatible way (old clients ignore fields they don't recognize; new clients handle absent fields gracefully), which let services evolve their APIs independently without constantly breaking every caller.

## Stubby, and why gRPC exists

Stubby was Google's internal RPC framework, built to work directly with Protocol Buffer-defined service interfaces: you'd define a service's methods in a `.proto` file alongside its message types, and Stubby handled the actual mechanics of making the call over the network, load balancing across service instances, and integrating with Google's internal infrastructure for things like authentication and monitoring. It became the default way essentially any Google service talked to any other Google service internally.

Stubby itself was never open-sourced, tied too closely to Google-internal infrastructure to be broadly useful outside the company. gRPC, released publicly in 2015, is best understood as Google taking the core ideas Stubby had proven out internally, protobuf-defined services, efficient binary serialization, built-in support for streaming and multiple languages, and building a new, HTTP/2-based implementation designed from the start to work outside Google's specific internal infrastructure. It's since become a common choice for internal service-to-service RPC well beyond Google, particularly in microservice architectures that need better performance and stronger typing than a REST-over-JSON approach provides.

## What you can borrow

- Standardizing on one serialization format and RPC framework across an organization avoids the compounding cost of every team-to-team integration being a bespoke negotiation.
- Schema-first serialization (protobuf, or alternatives like Avro or Thrift) gives you backward/forward compatibility guarantees that ad hoc JSON payloads don't, especially as APIs evolve across many independent teams.
- Binary serialization formats are worth adopting once RPC volume and payload size make JSON's overhead a measurable cost, not before — don't add the complexity prematurely.
- gRPC gives smaller organizations access to the same patterns Google built Stubby for, without needing to build the RPC framework in-house.
- Built-in support for streaming, deadlines, and cancellation in your RPC layer (which gRPC provides) prevents a lot of ad hoc, inconsistent timeout handling across services.
