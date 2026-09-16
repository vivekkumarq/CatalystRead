---
title: "eBPF in Production Observability: Maps, Probes, and the Cost of Seeing Everything"
slug: "ebpf-production-observability"
description: "bpftrace, BCC, and production agents: kprobes versus tracepoints, map memory, and why CO-RE beat copying kernel headers into the cluster."
publishedAt: "2026-09-18"
category: "DevOps"
tags:
  - DevOps
  - eBPF
  - Observability
  - Linux
sources:
  - title: "BPF Documentation"
    publisher: "kernel.org"
    url: "https://docs.kernel.org/bpf/"
  - title: "BPF Performance Tools"
    author: "Brendan Gregg"
    publisher: "Addison-Wesley"
    url: "https://www.brendangregg.com/bpf-performance-tools-book.html"
---

eBPF runs **verified** programs in the kernel: packet filters, syscall traces, latency histograms, and the guts of Cilium, Falco, and a generation of APM agents. You get visibility without a kernel module and without `strace` on every PID. You also get a new way to take down a node: an unbounded map, a probe on a too-hot path, or an agent that does not match the kernel.

## Tracepoints before kprobes

**Tracepoints** are stable-ish kernel instrumentation points. **kprobes** attach to functions that vanish between kernel builds. Production agents should prefer tracepoints, raw tracepoints, or CO-RE (Compile Once – Run Everywhere) BTF so one object file relocates across kernel versions. Shipping `bcc` tools that compile C on the node against kernel headers is a 2018 demo, not a 2026 fleet strategy.

```text
tracepoint:syscalls:sys_enter_connect → map[pid] = ts
tracepoint:syscalls:sys_exit_connect  → histogram(now - ts)
```

`bpftrace` one-liners are for incidents. Permanent collection belongs in a reviewed program with map sizes, sampling, and a CPU budget. Histogram maps are cheap; storing every stack for every syscall is not.

## Safety is the verifier, plus your ops

The verifier rejects unbounded loops and invalid memory. It does not reject "this probe fires a million times per second on `tcp_sendmsg`." Privilege: loading BPF is `CAP_BPF`/`CAP_PERFMON` on modern kernels, not everything is root — still treat agents as highly privileged. Multi-tenant: a customer workload should not load BPF on the host.

Overhead shows up as extra samples in CPU profiles of `ksoftirqd` or the agent. If p99 jumped after the agent rolled out, disable probes A/B. Privileged sidecars that mount `/sys/kernel/btf/vmlinux` need a security review.

## What to use it for

Latency heatmaps of syscalls, lost packets, run-queue latency, TLS without decrypting in userspace (careful: policy), and enforcement (network policy) with a team that can debug drops. Do not replace structured application logs with kernel traces of `write`.

Read Gregg's book for the tool catalog and the kernel docs for maps and helpers. Then set a memory limit on the agent and a sampling rate on the hottest probe. Observability that can hard-lock a node is not observability. It is a kernel extension with a dashboard.
