---
title: "Why WhatsApp Bet on FreeBSD and Tuned the Kernel Directly"
slug: "whatsapp-freebsd-kernel-tuning-connection-density"
description: "WhatsApp's small infrastructure team pushed FreeBSD's kernel to hold enormous numbers of concurrent connections per server instead of scaling out horizontally."
publishedAt: "2025-09-02"
category: "WhatsApp"
tags:
  - Engineering at Scale
  - WhatsApp
  - FreeBSD
  - Systems Programming
---

Most companies scaling a real-time messaging system reach for more servers behind a load balancer and call it a day. WhatsApp's infrastructure team took a different route for a long stretch of the company's history: run FreeBSD, an operating system most of the industry had moved past in favor of Linux, and push kernel-level tuning as far as it would go so that each individual server could hold as many simultaneous connections as physically possible. The reasoning was pragmatic rather than ideological — with a tiny operations team relative to WhatsApp's user base, fewer, more heavily loaded machines meant less infrastructure to manage, patch, and monitor.

## Squeezing more connections out of each box

Holding millions of long-lived TCP connections open on one machine runs straight into kernel limits that most operating systems don't expect to need in practice: file descriptor limits, the size and efficiency of the data structures tracking each socket, and how the scheduler handles waking up a huge number of mostly-idle connections when a small fraction of them have new data. WhatsApp's engineers worked directly in FreeBSD's kernel and networking stack, tuning and patching things like socket buffer sizing and interrupt handling, rather than treating the OS as a fixed black box underneath their application.

```text
sysctl-style tuning territory:
kern.maxfiles
kern.ipc.maxsockets
net.inet.tcp.sendspace / recvspace
```

FreeBSD was chosen in part because its cleaner, more approachable kernel source and networking stack made this kind of deep customization more tractable for a small team than an equivalent effort might have been elsewhere, and because the team had existing expertise with it. That familiarity mattered — deep kernel tuning is a multiplier on whatever operating system a team already understands well, not a reason to switch platforms cold.

## Erlang on top, tuned kernel underneath

The connection-handling and message-routing logic itself ran on Erlang and the BEAM virtual machine, chosen for its lightweight process model and built-in fault tolerance — each connected user could be represented by a cheap, isolated Erlang process without the memory and scheduling overhead a thread-per-connection model would impose at the same density. But Erlang's process model only pays off fully if the operating system underneath it can actually sustain the socket count and I/O throughput those processes need; the kernel tuning work was what let the application-level design realize its theoretical density rather than hitting an OS ceiling first.

## Fewer machines, less to operate

The payoff of this approach showed up less in a single benchmark number and more in operational simplicity: with each server able to hold a very large number of concurrent connections, WhatsApp needed a strikingly small fleet relative to its user count, which in turn meant a strikingly small operations team could keep it running. Every layer of the stack — kernel, virtual machine, application — was tuned in service of that one organizational constraint, rather than each layer being optimized independently against its own local metric.

## What you can borrow

- Don't assume your default operating system choice is neutral; kernel-level limits on connections, file descriptors, and scheduling can become real bottlenecks at high concurrency.
- Deep systems tuning pays off most when it compounds with an application architecture (like lightweight per-connection processes) that's already designed to exploit it.
- Fewer, more heavily loaded machines can be a deliberate strategy to reduce operational surface area, not just a cost-cutting side effect.
- Invest tuning effort in the platform your team already knows deeply rather than chasing a platform that's merely fashionable.
