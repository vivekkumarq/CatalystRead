---
title: "Argo CD Sync Waves: Ordering GitOps When Hooks Are Not Enough"
slug: "argo-cd-gitops-sync-waves"
description: "sync-wave annotations, hooks, and waves that wait: how to roll CRDs before CRs, and the deadlock of a wave that never becomes healthy."
publishedAt: "2026-08-08"
category: "DevOps"
tags:
  - DevOps
  - GitOps
  - Argo CD
  - Kubernetes
sources:
  - title: "Sync waves"
    publisher: "Argo CD"
    url: "https://argo-cd.readthedocs.io/en/stable/user-guide/sync-waves/"
  - title: "Resource hooks"
    publisher: "Argo CD"
    url: "https://argo-cd.readthedocs.io/en/stable/user-guide/resource_hooks/"
---

Argo CD applies a Git directory to a cluster. A naive apply dumps CRDs and Custom Resources in one shot; the CR is rejected because the CRD is not ready. **Sync waves** (`argocd.argoproj.io/sync-wave: "1"`) order resources. Lower waves go first. Argo waits for health (or a timeout) before the next wave. Hooks (`PreSync`, `PostSync`, `SyncFail`) run Jobs for migrations. Together they are how GitOps gets a **sequence** without a Jenkins script.

## Waves are numbers, not a workflow engine

A typical pattern: wave `-1` namespaces and CRDs, wave `0` operators, wave `1` the operator's CRs, wave `2` the app. Negative waves run before the default `0`. Do not invent a 40-wave novel. Each wait is a source of "stuck syncing."

```yaml
metadata:
  annotations:
    argocd.argoproj.io/sync-wave: "1"
```

Health checks must be truthful. A Deployment that is "healthy" with zero replicas ready will advance the wave and break the next. Jobs as hooks must be idempotent; `PreSync` that runs a migration twice needs the same care as CI.

## Hooks versus waves

Hooks are separate objects (often Jobs) with delete policies (`HookSucceeded`). They are right for schema migrate, cache flush, or slack notify. Waves are right for Kubernetes resource kinds that must exist first. Using a hook to `kubectl apply` more YAML duplicates GitOps. Prefer waves for in-repo resources.

Sync options (`ApplyOutOfSyncOnly`, `Prune`, `Replace`) interact with waves. Prune in early waves can delete something a later wave needs if you mis-label. App-of-apps: parent and child waves are **not** one timeline unless you design it. Children sync independently; a parent wave cannot always wait for a child's nested waves the way people assume.

## Failure modes

A wave waits on a CrashLoop. The Application looks hung. Timeouts (`timeout.reconciliation`, resource health timeouts) should be finite. `RespectIgnoreDifferences` and generated fields can keep a resource OutOfSync forever, blocking waves that wait on "synced."

If you need a DAG more complex than a few integers, you may want Argo Workflows or Helm hooks with eyes open — or to split Applications so CRDs live in a cluster-bootstrap app that syncs first.

Read Argo's sync waves and hooks pages, then annotate CRDs and CRs in a dry-run app. If the first sync still errors on type not found, the CRD wave did not become ready — health, not YAML order, was the bug.
