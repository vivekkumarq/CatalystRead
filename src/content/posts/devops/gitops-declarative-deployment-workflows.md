---
title: "GitOps: Declarative Deployment Workflows Done Right"
slug: "gitops-declarative-deployment-workflows"
description: "How GitOps replaces imperative deploy scripts with a reconciled, auditable source of truth, and the practical patterns for running it well with Argo CD or Flux."
publishedAt: "2025-10-27"
category: "DevOps"
tags:
  - GitOps
  - Kubernetes
  - DevOps
  - CI/CD
trending: true
---

GitOps sounds like a rebrand of "keep your infrastructure config in Git," and at a shallow level it is, but the meaningful part is the reconciliation loop. Instead of a CI pipeline pushing changes to a cluster imperatively, a controller running inside the cluster continuously compares actual state to the state declared in Git and corrects drift automatically. That shift — from "push and hope" to "declare and reconcile" — is what actually changes operational behavior.

## Push-based CD versus pull-based reconciliation

A traditional pipeline runs `kubectl apply` or `helm upgrade` as a step in CI, which means the cluster's credentials have to live in the CI system, and if someone applies a manual `kubectl edit` afterward, nothing detects or corrects it. A GitOps controller like Argo CD or Flux flips this: it runs inside the cluster, watches a Git repository, and pulls changes on its own schedule.

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: payments-api
  namespace: argocd
spec:
  project: default
  source:
    repoURL: https://github.com/example-org/payments-manifests.git
    targetRevision: main
    path: overlays/production
  destination:
    server: https://kubernetes.default.svc
    namespace: payments
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
```

`selfHeal: true` is the feature that makes drift correction real: if someone manually scales a deployment or edits a ConfigMap directly in the cluster, Argo CD reverts it back to what Git declares on the next reconciliation pass. That's a deliberate trade-off — it removes the ability to "quietly patch production" as a debugging shortcut, which is exactly the point.

## Structuring the repository

Most GitOps setups separate the application source repo from the manifests repo, so a merge to the app repo triggers CI to build an image and update a manifest reference, but doesn't itself touch the cluster. The manifests repo is what the GitOps controller actually watches:

```
manifests-repo/
  base/
    deployment.yaml
    service.yaml
    kustomization.yaml
  overlays/
    staging/
      kustomization.yaml
      replica-patch.yaml
    production/
      kustomization.yaml
      replica-patch.yaml
```

Kustomize overlays keep environment differences explicit and reviewable in a pull request, rather than buried in pipeline variables that only take effect at deploy time.

## The image update problem

The one piece GitOps doesn't solve on its own is how a new image tag gets into the manifests repo in the first place. Two common patterns: CI commits the updated tag directly to the manifests repo as its last step, or a tool like Argo CD Image Updater / Flux's image automation controller watches the registry and opens the commit itself.

```yaml
# Flux ImagePolicy example
apiVersion: image.toolkit.fluxcd.io/v1beta2
kind: ImagePolicy
metadata:
  name: payments-api
spec:
  imageRepositoryRef:
    name: payments-api
  policy:
    semver:
      range: ">=1.0.0"
```

Either approach keeps the deployment trigger inside Git history, which is the property that makes GitOps auditable: every production change traces back to a commit with an author, a timestamp, and a diff, instead of a pipeline log that rotates out after thirty days.

## Rollbacks become git reverts

Because desired state is just a Git ref, rolling back is a `git revert` followed by the controller reconciling the previous state — no separate rollback tooling, no "redeploy the last known-good artifact" script to maintain. The trade-off is discipline: manifests must be genuinely declarative, with no imperative steps hiding in post-sync hooks, or the revert won't actually restore the state you expect.
