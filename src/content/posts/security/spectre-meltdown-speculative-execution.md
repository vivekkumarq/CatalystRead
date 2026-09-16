---
title: "Spectre and Meltdown: Speculative Execution as a Leaky Abstraction"
slug: "spectre-meltdown-speculative-execution"
description: "Kocher et al. and Lipp et al.: how mispredicted paths leave traces in caches, and what isolation still means after the 2018 papers."
publishedAt: "2026-08-26"
category: "Security"
tags:
  - Security
  - Hardware
  - Side Channels
  - Isolation
sources:
  - title: "Spectre Attacks: Exploiting Speculative Execution"
    author: "Paul Kocher et al."
    publisher: "IEEE S&P 2019"
    url: "https://spectreattack.com/spectre.pdf"
  - title: "Meltdown: Reading Kernel Memory from User Space"
    author: "Moritz Lipp et al."
    publisher: "USENIX Security 2018"
    url: "https://meltdownattack.com/meltdown.pdf"
---

CPUs guess. They execute instructions **speculatively** along a predicted branch or as if a permission check passed, then roll back architectural state if the guess was wrong. Kocher et al. (Spectre) and Lipp et al. (Meltdown) showed that **microarchitectural** state — cache lines, BTB, fill buffers — is not always rolled back. A victim's secret can modulate which cache line is hot; an attacker times access and reconstructs the bit.

## Meltdown versus Spectre, operationally

**Meltdown** (rogue data cache load) let user code speculatively read kernel-mapped physical memory on some Intel designs because the permission check was ordered late. **KPTI** (kernel page-table isolation) and later silicon were the answers. If your fleet is unpatched 2017 silicon, this is still a CVE; if it is current, Meltdown-class holes are mostly in the "applied mitigations" column.

**Spectre** is a family. Variant 1: bounds-check bypass — speculate past `if (i < len)`, read `arr[i]`, then use that value to index a second array the attacker times. Variant 2: branch target injection — poison indirect branch prediction so the victim speculatively jumps to a gadget. Later variants use other predictors and buffers. Software mitigations include `lfence`, retpolines, restricted speculation, and compiler pass options. They cost cycles. Cloud vendors toggle them per CPU generation.

```text
speculative: read secret → touch probe[secret*256]
architecturally: squash
microarch: probe line still warm → attacker times
```

## What application developers still own

You cannot "code around" every Spectre gadget in a JIT. Browsers site-isolated processes, reduced timer resolution, and disabled shared memory in some contexts because JavaScript was a practical Spectre remote. JITs (V8, JVM) shipped mitigations; keep runtimes current. **Constant-time crypto** still matters: speculative execution is one more way control flow and data-dependent addressing leak.

Shared-hardware multi-tenancy is the threat that made these papers existential for cloud. If two VMs share a core, speculative leakage is in scope. If you run a single-tenant box, priority drops relative to SQL injection — but CI runners that execute untrusted code on the same kernel as secrets are closer to the paper's world.

## How to talk about this without theater

List CPU microcode, kernel, hypervisor, and runtime versions in the security baseline. Know which mitigations are on (`lscpu` speculation flags, cloud CPU feature docs) and what latency they cost. Do not disable mitigations "for Java benchmarks" on a multi-tenant host.

Read the two original papers' diagrams of the probe array. They are still the clearest explanation. Then treat isolation as a stack: process, kernel, hypervisor, and silicon, each with a leaky abstraction. Speculative execution was supposed to be invisible. The 2018 papers are why we no longer write that in threat models.
