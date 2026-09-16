---
title: "HPA and VPA: Autoscaling Pods Without Oscillating Through PagerDuty"
slug: "kubernetes-hpa-vpa-and-when-to-use-each"
description: "Horizontal versus vertical autoscaling in Kubernetes, custom metrics, and the cooldown and request-sizing mistakes that cause flapping."
publishedAt: "2026-08-26"
category: "DevOps"
tags:
  - DevOps
  - Kubernetes
  - Autoscaling
  - Reliability
---

The Horizontal Pod Autoscaler adds and removes replicas from a CPU (or custom) signal. The Vertical Pod Autoscaler suggests or applies CPU/memory requests so each pod is sized closer to what it uses. They solve different problems. Running both on the same workload without a plan is how you get a replica count and a request size chasing each other.

## HPA is for load that looks like more copies

Stateless HTTP services with even-ish work per request are the happy path. You need:

- **Requests set honestly.** HPA uses utilization against requests, not limits. If you requested 100m to be polite and the pod uses 800m, utilization is nonsense and scale-up never matches reality.
- **A signal that leads the user-visible SLO.** CPU works until the bottleneck is a lock, a downstream DB, or event-loop lag. Custom metrics (RPS per pod, queue depth, P99 from Prometheus adapter) exist because CPU lied.
- **Stabilization windows.** Scale-down delay is not cowardice. Traffic has spikes. Immediate scale-down after a World Cup goal is how you pay the cold-start tax twice.

```yaml
behavior:
  scaleDown:
    stabilizationWindowSeconds: 300
    policies:
      - type: Percent
        value: 50
        periodSeconds: 60
```

## VPA is for "this process needs more RAM than we guessed"

Batch jobs, sidecars with slowly growing caches, and services you cannot shard yet. VPA in recommendation mode is the safe default: it writes suggested requests you apply in the next deploy. Auto mode that evicts pods to apply new sizes is a readiness event — treat it like a rolling deploy, not a background optimizer.

Do not VPA-auto a latency-sensitive service that is also HPA'd on CPU unless you have read the current Kubernetes docs on the interaction. Request changes alter utilization, which alters HPA, which alters load per pod, which alters VPA. Oscillation looks like "Kubernetes is haunted."

## Cluster autoscaler is the third loop

HPA can want 40 pods. The cluster must have nodes. If node provisioning takes eight minutes, your HPA max is a fiction during a spike. Over-provision a small buffer pool, or use in-place scale-up features where they exist, or accept that the SLO during a flash crowd includes "we were waiting for VMs."

Autoscaling is a control system. Name the setpoint (utilization, lag), the actuator (replicas vs requests vs nodes), and the delay. If you cannot draw those three, you are not tuning HPA — you are adding YAML until the graph looks calm in staging.
