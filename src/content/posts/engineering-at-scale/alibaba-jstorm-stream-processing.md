---
title: "JStorm: Alibaba's Storm Fork When the In-House Stream Had to Outrun the Upstream"
slug: "alibaba-jstorm-stream-processing"
description: "How Alibaba forked Apache Storm into JStorm to get a faster, more operable stream processor for commerce and logging pipelines at internal scale."
publishedAt: "2026-12-05"
updatedAt: "2026-12-05"
category: "Alibaba"
tags:
  - Engineering at Scale
  - Alibaba
  - Stream Processing
  - Data Engineering
sources:
  - title: "JStorm"
    publisher: "Alibaba"
    url: "https://github.com/alibaba/jstorm"
  - title: "Apache Storm"
    publisher: "Apache Software Foundation"
    url: "https://storm.apache.org"
---

Apache Storm popularized the DAG of spouts and bolts: tuples flow, workers crash, the cluster tries to ack. Alibaba's traffic and operational requirements produced JStorm, an internal-then-open-source fork that aimed at higher throughput, a more Java-native runtime, and operations that a Storm cluster at Alibaba size had outgrown. Forking a stream processor is a serious choice. It means you will own compatibility, you will lag or lead upstream, and you are betting that the programming model is right and the implementation is the bottleneck.

## Why fork instead of wait

Storm's early JVM model, ZooKeeper usage, and worker isolation had sharp edges under huge tuple rates. Alibaba's writing around JStorm emphasized performance work, a different netty/serialization path, and features for easier deployment in their environment. The topology API stayed familiar on purpose: migrating a thousand bolts is more expensive than swapping the engine under the same DAG ideas.

At Alibaba, stream jobs are not only "recommendations." They are logging, metrics, risk, and commerce events. Backpressure and ack storms (when every tuple's ack is more expensive than the work) become the incident. A fork that can turn off acks for loss-tolerant paths, or batch acks, is a throughput feature.

## Exactly-once is a negotiation

Storm's original at-least-once plus idempotent bolts is still the honest story for many pipelines. Transactional topologies and later frameworks (Flink, in the wider industry) chased stronger guarantees. JStorm lived in the era where Alibaba also invested in other engines. The lesson for readers is not "JStorm won streaming." It is that a company at Alibaba's scale will run several processors and will fork when an open-source core is almost right.

State in bolts is a trap. Local memory state dies with the worker. External stores become the real processor. Design for that or you will rediscover why Flink's managed state was appealing.

## Failure modes of Storm-shaped clusters

The concrete failure is a ZooKeeper or Nimbus (master) hotspot, so the cluster cannot rebalance while tuples pile up in Kafka (or TimeTunnel, in Alibaba's world). Mid-size steal: keep coordinators boring, and make the log the buffer of record so a processing outage does not lose the firehose.

Operational gotcha: topologies that share a cluster without isolation, so a bad deserialize in one bolt OOMs workers that run unrelated jobs. Cgroups and per-topology clusters exist for a reason. Another is tuple schemas that evolve without a contract; downstream bolts NPE and replay forever. Version the payload. Ack chains that include a slow HTTP call will stall the spout. Do IO in a pattern that does not block the event loop of the worker. If you fork, staff it. An abandoned fork is worse than upstream Storm with known bugs. Prefer contributing or using Flink/Spark Structured Streaming today unless you already have a JStorm estate. The borrowable piece is the operational metrics: tuple fail rate, complete latency, and spout lag, on dashboards that page humans. Replay from the log after a bad deploy should be a button with a start offset, not a rebuild of last week's Hive dump. If you cannot name the offset you would rewind to, you do not yet operate a stream.

## What you can borrow

- Keep the DAG programming model stable even when you replace the engine.
- Buffer in a durable log; the processor should be allowed to die.
- Isolate topologies so one bad bolt cannot OOM the company.
- Measure ack/fail/lag; "the Storm UI is green" is not a pipeline SLO.
