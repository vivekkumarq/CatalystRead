---
title: "Managed Kubernetes: What the Provider Actually Does for You"
slug: "managed-kubernetes-what-the-provider-actually-does"
description: "EKS, GKE, and AKS all promise to take Kubernetes operations off your plate, but the actual division of responsibility is narrower than most teams assume."
publishedAt: "2025-12-15"
category: "Cloud"
tags:
  - Kubernetes
  - Cloud
  - AWS
  - Infrastructure
---

"Managed Kubernetes" is a phrase that quietly does a lot of work in a sales conversation, because it implies a much larger scope of managed responsibility than what EKS, GKE, or AKS actually take off your team's plate. The control plane genuinely is managed. Almost everything else — node management, upgrades, add-ons, and every workload running on top — is still your responsibility, just with better tooling than running Kubernetes from scratch.

## What "control plane managed" actually covers

The provider runs and patches the API server, etcd, the scheduler, and the controller manager, and guarantees their availability per the service SLA. That's a genuinely meaningful operational burden removed — etcd backup and restore, API server high availability, and control plane version patching are non-trivial to run well, and getting them for a flat hourly fee (or free, on some providers) is real value.

```bash
# You don't manage this, the provider does
aws eks describe-cluster --name prod-cluster --query 'cluster.status'
# "ACTIVE" — control plane health is the provider's problem
```

What it does not cover: anything running on the worker nodes, which is still fundamentally your cluster to operate.

## Node management is still mostly on you

Even with managed node groups, you're responsible for choosing instance types, sizing node pools, handling node-level OS patching cadence (unless using a fully managed node offering like EKS Auto Mode or GKE Autopilot), and configuring autoscaling correctly:

```yaml
# EKS managed node group — provider handles node provisioning lifecycle,
# you still choose instance types, scaling bounds, and AMI update cadence
apiVersion: eksctl.io/v1alpha5
kind: ClusterConfig
managedNodeGroups:
  - name: general-purpose
    instanceType: m6i.large
    minSize: 3
    maxSize: 20
    desiredCapacity: 5
    updateConfig:
      maxUnavailablePercentage: 25
```

Autopilot-style fully-managed node offerings (GKE Autopilot, EKS Auto Mode) go further and manage node provisioning, sizing, and patching automatically based on workload requests, at a real cost premium and with some constraints on what pod specs are allowed (privileged containers and hostPath volumes are commonly restricted). That's a genuinely different, higher level of "managed" than a standard managed node group, and worth evaluating on its own terms rather than assuming all managed Kubernetes offerings sit at the same point on this spectrum.

## Upgrades require your active participation

Control plane version upgrades are typically provider-initiated or provider-scheduled, but node group upgrades, in-cluster add-on version compatibility, and — critically — your own workloads' compatibility with the new Kubernetes version are entirely your responsibility to verify:

```bash
# You still need to check this before every control plane upgrade
kubectl get apiservices | grep -v Local
kubectl deprecations  # via kubent or similar, checking for removed APIs
```

A control plane upgrade to a version that removes a deprecated API your Helm charts still use will break deployments the moment it lands, regardless of how smoothly the provider's own upgrade process ran. Testing upgrades against a staging cluster first, and running deprecation scanners like `kubent` or `pluto` ahead of any planned upgrade, is not optional busywork — it's the part of "managed" Kubernetes that the provider explicitly doesn't do for you.

## What you should actually budget engineering time for

Realistically, running managed Kubernetes well still requires ongoing investment in: RBAC and network policy configuration, workload resource requests and limits, cluster autoscaler or Karpenter tuning, add-on lifecycle management (ingress controllers, cert-manager, service mesh), and security patching cadence for anything running inside the cluster. The provider removes a substantial, genuinely hard operational burden — but "managed" here means "the control plane is managed," not "your Kubernetes operations team can be smaller than zero." Plan staffing and on-call accordingly, especially for the first year after adoption when most of these gaps get discovered the hard way.
