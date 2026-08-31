---
title: "Secrets Management Approaches in Modern Infrastructure"
slug: "secrets-management-approaches-in-modern-infrastructure"
description: "A comparison of secrets management patterns, from environment variables to dedicated vaults, and how to pick the right one without overengineering a simple app."
publishedAt: "2025-11-24"
category: "DevOps"
tags:
  - DevOps
  - Security
  - Infrastructure
  - Kubernetes
---

Every team ends up with secrets — database passwords, API keys, TLS certificates — and every team eventually has to decide how those secrets get from a secure store into a running process without landing in Git history, build logs, or a container image layer. The right answer depends heavily on scale and threat model, and reaching for the heaviest tool by default usually just adds operational overhead without matching risk.

## The baseline: environment variables from a secret store

For most applications, the practical baseline is injecting secrets as environment variables at deploy time, sourced from a managed secret store rather than committed anywhere. In Kubernetes, this typically means a Secret resource populated by an external tool, not authored by hand:

```yaml
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: payments-db-credentials
spec:
  secretStoreRef:
    name: aws-secrets-manager
    kind: ClusterSecretStore
  target:
    name: payments-db-credentials
  data:
    - secretKey: password
      remoteRef:
        key: prod/payments/db-password
```

The External Secrets Operator syncs from AWS Secrets Manager, Vault, or similar into a native Kubernetes Secret, which means the actual secret value never has to be typed into a manifest or CI variable by hand. Rotation happens at the source, and the operator picks up the new value on its next sync.

## Why plain Kubernetes Secrets aren't enough on their own

A raw Kubernetes Secret is only base64-encoded, not encrypted, unless the cluster has encryption at rest enabled for the etcd datastore. Anyone with `get secrets` RBAC permission in that namespace can read the plaintext value trivially:

```bash
kubectl get secret payments-db-credentials -o jsonpath='{.data.password}' | base64 -d
```

That's not a flaw exactly — Secrets were never designed as the source of truth, just a delivery mechanism — but treating them as sufficiently protected on their own is a common misconception. Enabling etcd encryption and tightly scoping RBAC around the `secrets` resource type are both necessary, not optional extras.

## Dedicated secret managers for dynamic and short-lived credentials

Static secrets solve part of the problem, but a meaningful security improvement comes from dynamic secrets — credentials generated on demand, scoped to a short TTL, and automatically revoked. HashiCorp Vault's database secrets engine is the canonical example:

```bash
vault write database/roles/payments-readonly \
  db_name=postgres-prod \
  creation_statements="CREATE ROLE \"{{name}}\" WITH LOGIN PASSWORD '{{password}}' VALID UNTIL '{{expiration}}'; GRANT SELECT ON ALL TABLES IN SCHEMA public TO \"{{name}}\";" \
  default_ttl=1h \
  max_ttl=4h
```

Every consumer that requests credentials from this role gets a unique, time-boxed database user instead of a shared static password. If a credential leaks in a log, it expires within the hour instead of being valid indefinitely — a fundamentally different risk profile than rotating a single shared secret manually every quarter.

## Matching the tool to the actual risk

A small internal tool with a handful of secrets rarely justifies standing up Vault with its own HA cluster, unseal process, and audit logging pipeline — a managed secrets manager with IAM-based access control covers that case with far less operational burden. Vault (or an equivalent) earns its complexity when you need dynamic credentials, fine-grained per-team access policies, or secrets shared across multiple heterogeneous platforms (Kubernetes, VMs, CI runners) that a single cloud provider's secrets manager doesn't cleanly span. Pick based on the actual blast radius of a leaked credential, not on what the most sophisticated team in the industry uses.
