---
title: "GitHub Actions Ephemeral Runners: Isolation Beats a Warm, Dirty Host"
slug: "github-actions-ephemeral-runners"
description: "GitHub-hosted VMs versus autoscaled ephemeral self-hosted: dirty workspaces, credential lifetime, and when Buildkite's similar model is the same idea."
publishedAt: "2026-08-13"
category: "DevOps"
tags:
  - DevOps
  - GitHub Actions
  - CI
  - Security
sources:
  - title: "GitHub-hosted runners"
    publisher: "GitHub Docs"
    url: "https://docs.github.com/en/actions/using-github-hosted-runners/about-github-hosted-runners"
  - title: "Autoscaling with self-hosted runners"
    publisher: "GitHub Docs"
    url: "https://docs.github.com/en/actions/hosting-your-own-runners/autoscaling-with-self-hosted-runners"
---

A CI runner that lives for months accumulates SSH keys, Docker images, and `npm` caches from other repos. That warmth is speed and a **cross-job isolation failure**. GitHub-hosted runners are **ephemeral VMs** per job (with documented software images). Self-hosted runners are often pets. The 2026 default for untrusted PR code is: ephemeral, one job, throw away the machine (or at least the container).

Buildkite's elastic CI stack and Actions runner scale-sets (Actions Runner Controller on Kubernetes, or cloud VM pools) are the same design: job arrives, mint a runner, job ends, terminate.

## Why pets fail

Self-hosted `actions-runner` on a beefy box: cache is great; a malicious workflow (`pull_request` from a fork) can leave a systemd unit. Even trusted monorepos leak credentials into world-readable workspaces. Ephemeral runners still need **OIDC to cloud** (short-lived tokens) rather than long-lived access keys on disk.

```yaml
permissions:
  id-token: write
  contents: read
# federate to AWS/GCP; no static keys on the runner
```

GitHub-hosted is simplest isolation and a cost/queue trade. Self-hosted ephemeral is for private networks, GPUs, or license servers. If you cannot terminate the VM, run the job in a disposable container **and** still assume kernel escape is in the threat model for hostile PRs — don't run fork PRs on privileged cluster nodes.

## Caches without sticky disks

Actions cache and registry caches restore warmth without keeping the runner. Nix and container layer caches belong in object storage. Local Docker layer cache on a pet is why people refuse to go ephemeral; remote buildkit or registry cache closes that gap.

Label hygiene: jobs must request a runner label that only ephemeral pools have. A leftover `self-hosted` label on a laptop in a closet will pick up production deploys.

## Fork PRs

`pull_request_target` with untrusted checkout is a classic hole. Ephemeral does not fix a workflow that checks out attacker code and then uses `GITHUB_TOKEN` with write. Combine isolation of compute with least-privilege tokens.

Read GitHub's hosted runner and autoscaling docs (and Buildkite's elastic stack if that is your queue). Then list every self-hosted runner by age. Anything older than a day that still accepts `pull_request` from forks is a standing incident.
