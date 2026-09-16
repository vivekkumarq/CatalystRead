---
title: "Schema Registry: Compatibility Rules That Keep a Kafka Topic From Becoming a Truce"
slug: "confluent-schema-registry-compatibility"
description: "How Confluent Schema Registry stores Avro/Protobuf/JSON schemas with compatibility modes so producers and consumers can evolve without a coordinated outage."
publishedAt: "2026-12-21"
updatedAt: "2026-12-21"
category: "Confluent"
tags:
  - Engineering at Scale
  - Confluent
  - Apache Kafka
  - Data Engineering
sources:
  - title: "Schema Registry"
    publisher: "Confluent"
    url: "https://docs.confluent.io/platform/current/schema-registry/index.html"
  - title: "Compatibility types"
    publisher: "Confluent"
    url: "https://docs.confluent.io/platform/current/schema-registry/fundamentals/schema-evolution.html"
---

A Kafka topic without a schema is a bag of bytes and a Slack argument. Confluent Schema Registry puts a schema (Avro, Protobuf, or JSON Schema) behind an ID, producers embed that ID, and consumers fetch the writer schema to decode. The useful invention is not the registry HTTP API. It is compatibility checks on register: BACKWARD, FORWARD, FULL, and the TRANSITIVE variants, so a new schema is rejected if it would break the consumers (or producers) you claim to care about.

## What the modes actually mean

BACKWARD means a new schema can be used to read old data — consumers upgrade first is the usual story, or you add fields with defaults so old writers still produce something new readers understand depending on direction. People mix this up weekly. FORWARD means old readers can read new data (typically consumers lag the producers). FULL is both. TRANSITIVE applies the rule across the whole history, not only versus the previous version, which is what you want if you actually keep old messages.

Removing a field, changing a type, or reusing a field number (Protobuf) are how you cause poison messages. The registry's job is to be the bad guy in CI. If someone can `curl -X POST` a breaking schema in production without a gate, you have a wiki, not a registry.

## The ID is part of the contract

Wire format (magic byte + schema id + payload) means the registry is on the deserialize path. Cache schemas in the client. A registry outage should not require a fetch per message. But a cold consumer still needs the registry or a local cache of IDs. Treat Schema Registry as production: HA, backups of the schemas topic (`_schemas`), and ACLs so not every app can overwrite `com.company.Order`.

Subject naming (`TopicNameStrategy` vs record name) decides how many schemas share a compatibility timeline. One schema per topic is simpler. A shared record name across topics can be correct for a type reused everywhere, and a blast radius when it is not.

## Failure modes of compatibility

The concrete failure is BACKWARD on a topic where producers deployed first, added a required field without a default, and old consumers exploded. Mid-size steal: pick a mode from the upgrade order you actually practice, and enforce it in CI against the registry.

Operational gotcha: `NONE` compatibility "temporarily." It becomes permanent. Another is JSON Schema with sloppy `additionalProperties` so compatibility is theater. Protobuf: never reuse field numbers. Avro: unions and enum evolution are sharp. If you dump the registry and rebuild with new IDs, every message on disk is undecodable. The schema ID space is part of your backup. Multi-cluster: replicate schemas or you cannot mirror topics. A poison message with an unknown ID will stall a consumer if you do not have a skip/DLQ policy. Steal compatibility as a social protocol: the rule is how teams negotiate time. Document "consumers first" next to BACKWARD. Test with a matrix of old/new reader/writer in CI, not only "the latest schema parses a sample."

## What you can borrow

- Enforce a compatibility mode that matches who upgrades first; do not guess.
- Cache schema IDs in clients; HA the registry like a control plane.
- Never rebuild schema IDs; back up the schemas topic.
- Add CI that registers against the real compatibility rule, plus a reader/writer matrix.
