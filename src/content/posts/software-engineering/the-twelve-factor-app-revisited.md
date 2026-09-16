---
title: "The Twelve-Factor App, Revisited for Containers and Managed Data Stores"
slug: "the-twelve-factor-app-revisited"
description: "Which of Heroku's 2011 factors still prevent outages, which ones aged (local disk, log sockets), and how to apply them without cargo-culting config vars."
publishedAt: "2026-09-10"
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
