---
title: "GitLab Shared Runners: Fair CI Capacity, and the Cache That Lies"
slug: "gitlab-ci-shared-runners-and-caching"
description: "How GitLab.com scaled CI with shared runners, isolation, and caching — and why a cache hit that skips a compile can still ship the wrong artifact."
publishedAt: "2026-11-16"
updatedAt: "2026-11-16"
category: "GitLab"
tags:
  - Engineering at Scale
  - GitLab
  - CI/CD
  - Developer Experience
sources:
  - title: "GitLab Runner"
    publisher: "GitLab"
    url: "https://docs.gitlab.com/runner/"
  - title: "Caching in GitLab CI/CD"
    publisher: "GitLab"
    url: "https://docs.gitlab.com/ci/caching/"
---

Self-hosted CI is a fleet of snowflake build machines until someone turns it into a product. GitLab's shared runners on GitLab.com had to take untrusted jobs from the public internet, isolate them, and still finish in a time developers would tolerate. That is a harder problem than "install Docker on a VM and share a cache disk." The interesting architecture is the combination of an autoscaled runner fleet, an executor model (often Docker or Kubernetes), and a cache that is explicitly not an artifact store.

## Untrusted jobs on a shared fleet

A shared runner cannot believe the job. It needs a fresh environment, a timeout, a network policy, and a way to stop a miner that looked like a compile. GitLab Runner's machine autoscaling and Kubernetes executor exist so capacity follows queues rather than a fixed pool that is idle on weekends and saturated on Monday. Tags pin jobs to runner classes: Linux, Windows, GPU, privileged. Privileged is the footgun. Shared runners that offer `privileged: true` for "Docker-in-Docker" are offering a path out of the sandbox. GitLab.com's public runners have spent years tightening that story, because one customer's CI is another customer's noisy neighbor and another customer's breakout risk.

Fairness is a scheduler problem dressed as product. A single project that fans out hundreds of jobs can starve everyone else unless there are concurrency limits per project, per user, and per runner tag. Shared CI without quotas becomes a tragedy of the commons with a progress bar.

## Cache is a hint; artifacts are the contract

GitLab CI distinguishes cache from artifacts because they fail differently. Cache is best-effort: a key (often a checksum of lockfiles) maps to a tarball in object storage. A miss means you rebuild; a hit means you might skip. Artifacts are the files you intended to keep and pass to the next stage or to a human. Treating node_modules cache as the thing you deploy is how you ship a tree that belonged to another branch when keys collide or when a job writes cache from a dirty workspace.

Distributed caches on S3-compatible storage are how shared runners on ephemeral VMs still win. A local Docker layer cache on a sticky host is faster and is also how you leak credentials between projects if isolation is wrong. Pull-through caches and dependency proxies exist to keep thousands of jobs from hammering npm and Docker Hub until you are rate-limited as a platform.

## Failure modes of shared CI

The concrete failure is a cache key that does not include the compiler version or a base image digest, so a runner image rollout "does nothing" while binaries change. Another is jobs that `pull` cache, never `push`, because the job failed after the build but before the cache upload — every pipeline is cold. Mid-size steal: define cache policy (pull-push, push only on default branch), make keys complete, and never use cache as the promotion path.

Operational gotcha: Docker-in-Docker on shared runners with a shared `/var/run/docker.sock` is not isolation. If you must build images, use a user namespace, Kaniko, BuildKit in a dedicated executor, or a separate trusted runner pool. Logs that print secrets from `set -x` in bash are a CI feature used as a credential scanner by attackers. Masked variables help only if you never encode them. Autoscaling that scales to zero is great until the cold start is longer than the job; keep a warm pool for the default image. If you run GitLab internally, do not give every group the same untagged shared runner with sudo. Tags and protected runners for protected branches exist so a fork MR cannot use the prod deploy token.

## What you can borrow

- Treat public or multi-tenant CI as untrusted compute: isolate, quota, and timeout before you optimize compile speed.
- Keep cache keys honest and never promote cache tarballs as release artifacts.
- Put dependency caches in object storage so ephemeral runners still hit.
- Split privileged or deploy-capable runners from the general pool and gate them on protected branches.
