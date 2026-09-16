---
title: "GitOps: Declarative Deployment Workflows Done Right"
slug: "gitops-declarative-deployment-workflows"
description: "How GitOps replaces imperative deploy scripts with a reconciled, auditable source of truth, and the practical patterns for running it well with Argo CD or Flux."
publishedAt: "2025-10-27"
updatedAt: "2026-09-16"
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

## A worked example

Git repo `env/prod/billing.yaml` image digest pinned. Argo CD syncs. A PR changes the digest after CI writes it. Prod is not `kubectl apply` from a laptop. Drift: Argo shows a live vs desired diff. Secrets from an external operator, not plaintext in git.

A broken sync pages the owner of the app, not a generic cluster channel.

## Failure modes

GitOps plus manual hotfix that never goes back to git. Auto-sync of `latest`. One repo for 200 apps with no CODEOWNERS. Secrets in git "encrypted" with a key in the same repo. Sync waves that deadlock. Rendering Helm on the laptop differently than the controller.

Using GitOps for database data.

## When this is the wrong tool

A toy cluster with one app. Terraform for cloud IAM may stay next to, not inside, k8s GitOps. Emergency break-glass is still required — GitOps is the wrong tool to block a 3am revert if git is down; have a documented override. Do not GitOps laptops. If the team cannot review YAML, the process fails regardless of Argo.

## A worked failure mode

Git is the source of truth except when someone `kubectl edit`s a Deployment at 3am and the controller reverts the hotfix, bringing the outage back. Another repo auto-syncs every PR to prod because the path filter was wrong. Secrets in Git are "encrypted" with a key that lives in the same repo. The failure is GitOps without break-glass rules and without promotion. Use overlays for prod, require reviews, store crypto keys elsewhere, and document how to pause sync during incidents.

GitOps is the wrong tool for a one-node lab. It is the wrong control loop if the team will not stop manual edits. Do not GitOps databases. Use it when many clusters must converge and humans can review diffs.

The wrong-tool test is easier with a concrete customer. If a user can lose money, lose access, or see someone else's data when "GitOps: Declarative Deployment Workflows Done Right" is slightly misapplied, do not let the pattern ride on defaults. Tighten the API, add an assertion in CI, and refuse silent fallbacks that look like success. Most production failures here are not exotic; they are a missing bound, a missing key, or a missing check that the original paper assumed a careful operator would have.
