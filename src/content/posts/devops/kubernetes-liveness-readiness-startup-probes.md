---
title: "Kubernetes Liveness, Readiness, and Startup Probes, Explained Properly"
slug: "kubernetes-liveness-readiness-startup-probes"
description: "The difference between liveness, readiness, and startup probes in Kubernetes, and the common misconfigurations that cause restart loops and dropped traffic."
publishedAt: "2025-09-15"
category: "DevOps"
tags:
  - Kubernetes
  - DevOps
  - Containers
  - Infrastructure
---

Probes are one of the few Kubernetes features that are simple to configure and dangerously easy to misuse. Get them wrong and you'll see one of two failure modes: pods stuck in an endless restart loop during a slow startup, or traffic routed to a pod that isn't actually ready to serve requests. Both are avoidable once you understand what each probe type is actually for.

## Three probes, three different jobs

A liveness probe answers "is this process still functioning, or should it be killed and restarted?" A readiness probe answers "should this pod currently receive traffic?" A startup probe answers "has this pod finished its initial boot sequence yet?" They sound similar but control completely different behaviors, and conflating them is the root of most probe-related incidents.

```yaml
apiVersion: v1
kind: Pod
spec:
  containers:
    - name: api
      image: registry.example.com/api:1.4.2
      startupProbe:
        httpGet:
          path: /healthz
          port: 8080
        failureThreshold: 30
        periodSeconds: 2
      livenessProbe:
        httpGet:
          path: /healthz
          port: 8080
        periodSeconds: 10
        failureThreshold: 3
      readinessProbe:
        httpGet:
          path: /ready
          port: 8080
        periodSeconds: 5
        failureThreshold: 2
```

Notice the startup probe uses a generous `failureThreshold` of 30 checks at 2-second intervals, giving the container up to a full minute to boot before liveness checks even begin. Without it, a slow-starting JVM or a service warming a large in-memory cache gets killed by the liveness probe before it ever finishes initializing, then restarts, then gets killed again.

## Why /healthz and /ready should not be the same endpoint

A common mistake is pointing liveness and readiness at the same handler that just returns 200 if the process is running. That conflates "alive" with "ready to serve," and it's usually wrong in both directions. A pod can be alive but not ready — for example, while it's still connecting to a database or waiting on a downstream dependency during a rolling restart. Conversely, a pod might be ready in steady state but should never be killed just because a dependency blips.

The readiness endpoint should check things that affect the pod's ability to serve requests correctly right now: database connectivity, cache warm-up state, downstream API health. The liveness endpoint should check only whether the process itself is deadlocked or unresponsive — nothing external.

```yaml
livenessProbe:
  exec:
    command: ["/bin/sh", "-c", "kill -0 $(cat /var/run/app.pid)"]
  periodSeconds: 15
readinessProbe:
  httpGet:
    path: /ready
    port: 8080
  periodSeconds: 5
```

## Failure thresholds and the restart-loop trap

If a liveness probe's `failureThreshold` and `periodSeconds` are too aggressive relative to how long a legitimate slow operation (a GC pause, a burst of load) can take, you get pods killed mid-request under normal conditions. A common production incident pattern: a service does fine under light load, then gets restarted repeatedly the moment traffic spikes because GC pauses exceed the liveness timeout. The fix is almost never "make the probe more lenient forever" — it's separating startup slowness (startup probe), transient unavailability (readiness probe), and genuine deadlock detection (liveness probe, with a wide enough margin that normal load variance never trips it).

As a starting point: set `initialDelaySeconds` on liveness to zero and let the startup probe own the boot period instead, keep liveness checks cheap and dependency-free, and make readiness the only probe allowed to fail because of external systems.
