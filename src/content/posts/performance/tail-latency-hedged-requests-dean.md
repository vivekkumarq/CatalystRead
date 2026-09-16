---
title: "The Tail at Scale: Hedged Requests and Why p99 Is a Systems Problem"
slug: "tail-latency-hedged-requests-dean"
description: "Dean and Barroso, CACM 2013: latency variability, hedged and tied requests, and the queueing that makes averages look fine."
publishedAt: "2026-08-16"
category: "Performance"
tags:
  - Performance
  - Latency
  - Distributed Systems
  - Reliability
sources:
  - title: "The Tail at Scale"
    author: "Jeffrey Dean and Luiz André Barroso"
    publisher: "Communications of the ACM, 2013"
    url: "https://research.google.com/pubs/pub40801.html"
  - title: "The Power of Two Choices in Randomized Load Balancing"
    author: "Michael Mitzenmacher"
    publisher: "IEEE TPDS"
    url: "https://ieeexplore.ieee.org/document/954642"
---

Google's "The Tail at Scale" (Dean and Barroso, CACM 2013) is the paper behind hedged requests and "why is p99 20× p50." Large fan-out RPCs turn a 1% slow backend into a high chance the **parent** is slow: `1 - 0.99^n` grows fast. Microslowdowns come from GC, compaction, packet loss, noisy neighbors, and queueing — not from a single bad algorithm. The average hides it. Users feel the parent wait.

## Variability is the workload

Even identical machines deliver a long tail. Waiting on **all** of 50 leaf services inherits the worst leaf. Waiting on the **first** of two replicas (hedged request) cuts that if replicas are independent. Dean and Barroso describe **hedged requests**: send a duplicate after a short delay if the first has not returned, cancel the loser. **Tied requests** send two at once with a cancellation protocol so the slower can stop work.

```text
parent fans out to 50 leaves
P(parent slow) ≈ 1 − (1 − P(leaf slow))^50
hedge: second request after p95 wait of the first
```

Cost: extra load. If everyone hedges immediately, you double traffic and make the tail worse. Hedge after a delay calibrated to the true p95, only on the critical path, with idempotent RPCs. Idempotency is not optional; a double charge is not a latency win.

## What else the paper wants you to do

Break big requests into parallel smaller ones **only** if you also manage the tail. Use latency-aware load balancing (choose the replica with shorter queue — two random choices). Isolate mice and elephants so a huge scan does not sit in front of an interactive RPC. Keep queues short; a long server queue is a tail factory.

Canary and "brownout" degraded modes: drop optional fan-out under load. That is product, not only infra.

## Translation to 2026 stacks

gRPC retries with backoff are not hedges. Hedging is **parallel** speculative issue. Service meshes sometimes offer it; measure amplification. Databases: hedged reads against replicas need read-your-writes care.

Read the CACM paper's figures on fan-out. Then plot p50/p99 on a parent endpoint and disable one extra retry that was firing immediately. If p99 falls and CPU falls, you were DDoSing yourself in the name of reliability. The tail is a queueing problem with a cancellation protocol, not a bigger instance type.
