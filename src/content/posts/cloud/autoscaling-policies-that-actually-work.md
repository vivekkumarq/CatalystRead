---
title: "Autoscaling Policies That Actually Work Under Real Traffic"
slug: "autoscaling-policies-that-actually-work"
description: "Why naive CPU-based autoscaling fails under real traffic patterns, and the metric choices and tuning that make autoscaling respond correctly instead of thrashing."
publishedAt: "2026-01-19"
updatedAt: "2026-09-16"
category: "Cloud"
tags:
  - Cloud
  - Kubernetes
  - Autoscaling
  - Infrastructure
---

Autoscaling looks simple on paper — add capacity when load is high, remove it when load is low — but the default configuration most teams ship (CPU-based scaling with default thresholds) tends to either lag badly behind real traffic spikes or thrash between scaling up and down under normal variance. Getting autoscaling to actually track load requires picking the right metric and tuning the reaction speed deliberately, not just enabling it.

## CPU is a lagging, indirect signal for a lot of workloads

CPU utilization correlates with load for compute-bound services, but for I/O-bound services — waiting on a database, an external API, a queue — CPU can stay low even while the service is genuinely saturated and queuing requests. A service bottlenecked on database connection pool exhaustion might sit at 20% CPU while response times climb into the seconds, and CPU-based autoscaling never triggers because the signal it's watching isn't the actual constraint:

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: checkout-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: checkout
  minReplicas: 3
  maxReplicas: 30
  metrics:
    - type: Pods
      pods:
        metric:
          name: http_requests_in_flight
        target:
          type: AverageValue
          averageValue: "50"
```

Scaling on a custom metric that reflects the actual bottleneck — in-flight requests, queue depth, connection pool utilization — tracks real saturation far more accurately than CPU for these workloads. This requires exposing that metric (via Prometheus and the Prometheus Adapter, commonly) rather than relying on what Kubernetes tracks natively, but it's the difference between autoscaling that responds to real degradation and autoscaling that's blind to it.

## Reaction speed: avoiding thrash without being too slow

Scaling too aggressively on short-lived spikes causes replica count to oscillate — scale up, traffic normalizes, scale down, traffic spikes again, repeat — which wastes the time spent provisioning new pods and can itself contribute to instability if new pods take meaningful time to become ready. Stabilization windows smooth this out by requiring a metric to stay elevated (or depressed) for a period before acting:

```yaml
behavior:
  scaleUp:
    stabilizationWindowSeconds: 0
    policies:
      - type: Percent
        value: 100
        periodSeconds: 60
  scaleDown:
    stabilizationWindowSeconds: 300
    policies:
      - type: Percent
        value: 10
        periodSeconds: 60
```

Asymmetric behavior here is deliberate: scale up fast (no stabilization delay, allowed to double capacity within a minute) because under-provisioning during a real spike causes user-visible errors, but scale down slowly (five-minute stabilization window, capped at 10% of capacity removed per minute) because over-provisioning briefly just costs money, while scaling down too fast risks removing capacity right before the next spike in a bursty traffic pattern.

## Predictive scaling for known patterns

For workloads with a strong, recurring daily or weekly pattern — traffic that reliably climbs every weekday at 9am — purely reactive autoscaling always lags the actual spike by however long it takes pods to become ready, which for a service with a slow startup (JVM warm-up, cache priming) can be a genuinely painful gap. Scheduled or predictive scaling addresses this by adjusting the minimum replica count ahead of the known pattern:

```yaml
# Scheduled minimum replica floor ahead of known daily traffic pattern
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
spec:
  triggers:
    - type: cron
      metadata:
        timezone: America/New_York
        start: 0 8 * * 1-5
        end: 0 19 * * 1-5
        desiredReplicas: "10"
```

This isn't a replacement for reactive scaling — it's a floor that ensures baseline capacity is already warm before the predictable spike arrives, with reactive scaling still handling anything beyond what the schedule anticipated. Combining a scheduled floor with a reactive, saturation-based ceiling covers both the predictable and unpredictable parts of real traffic far better than either approach alone.

## A worked failure mode

CPU-based HPA is set to 70%. A Java service sits at 40% CPU while the real bottleneck is a saturated connection pool; latency burns, no scale-out. When CPU finally rises, scale-out adds pods that all stampede the database and make it worse. Cooldown is 30 seconds, so the graph looks like a saw. The failure is scaling on a vanity metric with no max and no queue depth. Scale on saturation that matches the bottleneck (in-flight requests, queue lag, memory), cap replicas at what the data store can take, and load-test the scale-up path.

## When this is the wrong tool

Autoscaling is the wrong tool for a stateful singleton, a license-limited worker, or a batch job that should be a queue consumer count you set. It will not fix O(n^2) queries. Do not autoscale the database on the same naive CPU rule. Scheduled capacity may beat reactive scaling for a known daily peak. Use autoscaling when load is spiky, the bottleneck metric is honest, and downstreams have headroom.
If a dry-run in staging with production-like volume does not reproduce the benefit, do not scale the idea on a hope and a dashboard. Ship the smaller version that you can revert in one deploy.
