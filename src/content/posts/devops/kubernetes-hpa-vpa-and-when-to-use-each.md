---
title: "HPA and VPA: Autoscaling Pods Without Oscillating Through PagerDuty"
slug: "kubernetes-hpa-vpa-and-when-to-use-each"
description: "Horizontal versus vertical autoscaling in Kubernetes, custom metrics, and the cooldown and request-sizing mistakes that cause flapping."
publishedAt: "2026-08-26"
updatedAt: "2026-09-16"
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

## A worked HPA miss

CPU HPA target 70%, requests 100m, actual use 600m at 10 RPS per pod. Utilization is 600%, already maxed, but the limiter is a downstream database — more pods make more connections and p99 gets worse. Custom metric should have been queue depth or RPS with a max replica cap tied to DB pool budget. After switching to RPS-per-pod and a scaleDown window of 300s, replica count stops following every brief spike.

VPA recommendation on the same service then shows memory 512Mi vs requested 128Mi. Apply that on the next deploy *without* VPA auto-evict, then re-check HPA: higher requests lower CPU utilization for the same work, so HPA may scale down. Change one loop at a time.

## Failure modes

**Requests as fiction.** HPA math is utilization vs requests. Polite tiny requests guarantee nonsense.

**HPA+VPA auto together.** Request changes move utilization, which moves replicas, which moves per-pod load, which moves VPA. Oscillation.

**No max replicas.** A retry storm scales to the ceiling and takes the cluster with it. Max must exist and match a known downstream budget.

**Scale-to-zero on a latency SLO.** Cold start is part of the SLO; if you cannot pay it, keep a min replica.

## When not to autoscale

Sticky in-memory sessions, single-writer leaders, and licensed pods with a hard cap. Cron jobs that already request what they need. If load is a daily known peak, a scheduled replica count is simpler and easier to explain than a mis-tuned HPA. VPA auto-evict is the wrong tool for a latency-sensitive singleton.

## Review checklist

- Requests match reality; HPA signal leads the SLO (CPU or custom).
- Stabilization windows on scale-down; max replicas tied to a dependency budget.
- VPA recommendation mode first; do not combine VPA-auto with CPU HPA casually.
- Cluster node provisioning delay is in the capacity story.

## A worked failure mode

HPA on CPU and VPA on the same pods fight: VPA raises requests, utilization drops, HPA scales in, remaining pods OOM, VPA raises again. PagerDuty oscillates nightly. A custom metric on queue depth was the real need. The failure is two controllers on one knob. Pick HPA for replica count on a saturation metric; use VPA (or a rightsizing job) offline; never both live on the same workload without a documented policy.

## When this is the wrong tool

HPA is the wrong tool for a StatefulSet with one replica. VPA in auto mode is the wrong tool for a latency-critical JVM without a restart budget. Do not autoscale on a metric that does not bound work. Set requests honestly first.

A second, quieter failure is operational: the idea is copied from a talk into a path that has no rollback, no owner, and no metric that would show the invariant breaking. For "HPA and VPA: Autoscaling Pods Without Oscillating Through PagerDuty", that usually means a Friday deploy with production as the first realistic test. Write down the user-visible symptom, the invariant, and the revert before you scale the pattern. If revert is a data rewrite, you do not have a revert—you have a project. Practice the failure in staging with production-sized data at least once, or you will practice it on customers.
