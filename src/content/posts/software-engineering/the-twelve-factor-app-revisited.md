---
title: "The Twelve-Factor App, Revisited for Containers and Managed Data Stores"
slug: "the-twelve-factor-app-revisited"
description: "Which of Heroku's 2011 factors still prevent outages, which ones aged (local disk, log sockets), and how to apply them without cargo-culting config vars."
publishedAt: "2026-09-10"
updatedAt: "2026-09-16"
category: "Software Engineering"
tags:
  - Software Engineering
  - Architecture
  - DevOps
  - Cloud
sources:
  - title: "The Twelve-Factor App"
    author: "Adam Wiggins"
    publisher: "Heroku, 2011"
    url: "https://12factor.net/"
---

Twelve-factor was a reaction to apps that stored session files on one dyno's disk, baked credentials into git, and needed a release engineer to boot. Most of it still maps cleanly onto Kubernetes and Cloud Run. A few factors need translation because the platform under the app changed.

## The factors that still earn their keep

**Codebase / dependencies / config / backing services.** One repo per deployable (or a monorepo with a clear deployable), dependencies declared, config in the environment or a secret store, databases treated as attached resources you can rebind. Teams that still bake a JDBC password into an image layer are not "beyond twelve-factor." They are pre-2011.

**Build, release, run.** An immutable image tagged with a git SHA, config applied at release time, processes that do not mutate themselves. This is why "kubectl exec and edit a file" is an incident, not a workflow.

**Disposability and concurrency.** Crash-safe processes, fast boot, scale by adding processes. Virtual threads and async runtimes did not repeal this; they made it cheaper to have more concurrent work *inside* a process, which is a different axis than replica count.

**Logs as event streams.** Write to stdout; let the platform ship to a collector. Do not run your own logrotate sidecar unless you are the platform.

## What to update, not obey literally

**Attached storage.** Factor 6 (processes are stateless) never meant "no Redis." It meant do not put durable user data on ephemeral local disk. Object storage and databases are backing services. Local disk is a cache and a scratch space.

**Admin processes.** One-off `manage.py` on a laptop against production was the 2011 story. Today that is a job in the cluster with the same image and network policy as the app, or a carefully gated console. The spirit is: same artifact, not a snowflake script with extra credentials.

**Port binding.** Still right for containers. Service meshes and sidecars complicate "the process listens on $PORT" but do not replace it; they wrap it.

Use twelve-factor as a review checklist for a new service, then write down the two places you deviate (sticky WebSockets, a GPU that cannot be cattle). Deviations with a name age better than silent specialness.

## A worked example

A billing API stores `DATABASE_URL` and `STRIPE_KEY` in a secret manager, injected as env at process start. The image is `billing:gitsha`. Logs are JSON to stdout. Horizontal Pod Autoscaler adds replicas; session state lives in Redis, not `/tmp`. A migration runs as a Job using the same image and a command override, not a laptop.

A review checklist against a new service: can we replace the database URL without rebuilding? Can we kill a pod mid-request without corrupting a file on disk? If both answers are yes, twelve-factor did its job.

## Failure modes

Config in env for 200 keys becomes unreadable; people bake a subset into the image "just for defaults" and then cannot tell which layer won. Shared NFS as "backing service" that is actually a single point of failure. Log libraries that write to files *and* stdout duplicate and rotate badly. Sticky sessions to hold in-memory carts make disposability a lie. Dev/prod parity dies when developers run SQLite and production runs Postgres with different nulls.

`kubectl cp` of a patched JAR onto a live pod is an undisclosed release.

## When this is the wrong tool

A GPU training job with a 40 GB checkpoint on local SSD is not a twelve-factor web process; treat checkpoints as artifacts to object storage on a schedule. Desktop apps, firmware, and notebooks need different rules. Do not stretch "stateless processes" to mean "no cache": a local LRU is fine. Twelve-factor is the wrong hammer for a data warehouse dbt project whose "process" is a batch graph. Use the checklist for network services you scale by replica.

## Review checklist

- Secrets are not in the image; backing services are rebound by config.
- The same SHA-tagged artifact is what runs in every environment.
- Processes are crash-safe; local disk is cache, not the system of record.
- Deviations (sticky sockets, GPUs) are named, not silent.
