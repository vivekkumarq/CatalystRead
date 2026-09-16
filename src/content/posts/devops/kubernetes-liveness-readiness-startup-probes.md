---
title: "Kubernetes Liveness, Readiness, and Startup Probes, Explained Properly"
slug: "kubernetes-liveness-readiness-startup-probes"
description: "The difference between liveness, readiness, and startup probes in Kubernetes, and the common misconfigurations that cause restart loops and dropped traffic."
publishedAt: "2025-09-15"
updatedAt: "2026-09-16"
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

## A worked example

Startup probe: HTTP `/startup` until migrations-or-warm done, `failureThreshold` high. Liveness: cheap `/live` that does not touch the DB. Readiness: `/ready` checks DB. A wedged deadlock fails liveness and restarts; a DB blip fails readiness and drops from the Service without restart.

Probes on the management port.

## Failure modes

Liveness that hits the DB: restart storm during a DB outage. Same URL for all three. Too aggressive timeouts. No startup probe on a slow JVM, liveness kills it while booting. Exec probes that fork too much. Readiness never true due to a dependency you do not own.

gRPC without a grpc probe.

## When this is the wrong tool

A Job/CronJob that should run to completion — do not liveness-loop it into infinity. DaemonSets on every node may still want probes, but restarting kube-proxy-equivalents is special. If the app cannot provide a cheap live endpoint, fix the app. Probes are not SLOs. Sidecars need their own probe story or a shared delay.

## A worked failure mode

Liveness hits `/` which needs the database. A DB blip kills pods; they restart, stampede the DB, and never recover. Readiness is missing, so the Service sends traffic to a process that is still loading caches. Startup probe is absent; liveness kills a slow JVM during boot. The failure is using liveness as a dependency check. Liveness should mean "this process is wedged." Readiness means "it can take traffic." Dependencies belong in readiness or in the app's fail-open policy, not in a restart loop.

Probes are the wrong tool to fix a deadlock you should debug. Do not liveness-check a shared dependency. Skip fancy probes on a job that should just exit. Use the three probes with distinct meanings or you will DDoS yourself.

A worked anti-pattern: the team ships the architecture, then staffs it like a toy. "Kubernetes Liveness, Readiness, and Startup Probes, Explained Properly" needs boring operations—backups, timeouts, ownership, and a budget for the tax the idea always charges (compaction, replay, dual writes, extra latency, extra types). Unstaffed taxes come due at 2am. Put the tax in the design doc's cost section. If leadership wants the benefit without the tax, the honest answer is a smaller idea, not a heroic on-call rotation.
