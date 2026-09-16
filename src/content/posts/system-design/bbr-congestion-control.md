---
title: "BBR: Congestion Control That Tries to Model the Pipe, Not the Drops"
slug: "bbr-congestion-control"
description: "Cardwell et al. in ACM Queue: bottleneck bandwidth and RTT, why bufferbloat broke loss-based control, and what BBRv2 still argues about."
publishedAt: "2026-08-26"
category: "System Design"
tags:
  - System Design
  - Networking
  - Congestion Control
  - Latency
sources:
  - title: "BBR: Congestion-Based Congestion Control"
    author: "Neal Cardwell, Yuchung Cheng, C. Stephen Gunn, Soheil Hassas Yeganeh, Van Jacobson"
    publisher: "ACM Queue, 2016"
    url: "https://queue.acm.org/detail.cfm?id=3022184"
  - title: "BBRv2: A Model-Based Congestion Control"
    publisher: "IETF / Google"
    url: "https://datatracker.ietf.org/meeting/104/materials/slides-104-iccrg-an-update-on-bbr-00"
---

Loss-based congestion control (Reno, CUBIC) treats a dropped packet as the signal that the path is full. That worked when buffers were small. On modern paths, **bufferbloat** means queues grow for hundreds of milliseconds before a drop, so CUBIC fills the buffer, latency explodes, and throughput still looks fine on a speed test. Cardwell, Cheng, Gunn, Yeganeh, and Jacobson described **BBR** (Bottleneck Bandwidth and RTT) in ACM Queue: estimate the two numbers that define the pipe, and pace near the product of those estimates instead of chasing loss.

## The model

BBR measures **bottleneck bandwidth** (`BtlBw`) from delivery rate and **minimum RTT** (`RTprop`) from the smallest delay seen in a window. The bandwidth-delay product is the amount of data that should be in flight to use the pipe without a standing queue. Probe cycles briefly send faster to discover more bandwidth, then drain to re-measure RTmin so a persistent queue does not become the new "min RTT."

```text
in_flight ≈ BtlBw × RTprop
too little: underfill the path
too much:  build a queue, inflate RTT, hurt everyone
```

Pacing is load-bearing. Bursting a cwnd into the NIC recreates queues BBR was meant to avoid. Kernel BBR and QUIC BBR both spend complexity on pacing and on not starving CUBIC flows — fairness is the political part of congestion control.

## Deployment lessons, including the ugly ones

Google's production story was better latency for YouTube and search on inflated buffers, with competitive throughput. Independent measurements later showed BBRv1 could be **unfair** to CUBIC and could cause loss in shallow buffers or with many simultaneous BBR flows. BBRv2 added explicit response to loss and ECN, and more conservative probing. If you enable `net.ipv4.tcp_congestion_control=bbr` on a fleet because a blog post said it is faster, you may be exporting queueing pain to the other tenants of a shared bottleneck.

BBR is also not a WAN accelerator appliance. It cannot create bandwidth. It can stop your stack from confusing buffer delay with unused capacity. In datacenters with DCTCP or timely ECN, the right control may already be in place; slapping BBR on east-west RPC is an experiment, not a default.

## How to evaluate it like an engineer

A/B on **application latency**, not just iperf. Watch RTT histograms, retransmission rates, and the other congestion control on the path (mobile carriers, last-mile cable modems). Test many parallel flows. Test the reverse path. QUIC's userspace BBR may not match kernel BBR; measure the stack you actually run.

Read the Queue article for the bufferbloat diagnosis and the two-parameter model. Treat BBRv1 vs BBRv2 as an active compatibility problem. Congestion control is shared infrastructure: your win can be someone else's standing queue. That is why the paper's "model the pipe" idea is powerful and why flipping a sysctl is not a complete design.
