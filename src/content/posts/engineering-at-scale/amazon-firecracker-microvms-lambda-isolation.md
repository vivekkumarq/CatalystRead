---
title: "Firecracker: The microVM Behind Lambda's Isolation Model"
slug: "amazon-firecracker-microvms-lambda-isolation"
description: "How AWS built Firecracker, a minimal virtual machine monitor, to give Lambda functions strong isolation without paying the cost of a full VM."
publishedAt: "2025-09-02"
category: "Amazon"
tags:
  - Engineering at Scale
  - Amazon
  - Serverless
  - Virtualization
sources:
  - title: "Firecracker: Lightweight Virtualization for Serverless Applications"
    author: "Alexandru Agache et al."
    publisher: "NSDI 2020"
---

Running serverless functions from thousands of different customers on shared hardware creates a hard isolation problem. Containers share a host kernel, which means a kernel exploit in one customer's function could, in principle, reach another customer's data running alongside it on the same machine — an unacceptable risk at Lambda's scale and multi-tenancy. Full virtual machines solve the isolation problem convincingly, since each one runs its own kernel behind a hardware-enforced boundary, but traditional VMs were built for long-running general-purpose workloads: they boot in seconds, carry substantial memory overhead per instance, and emulate a wide array of legacy hardware devices that a serverless function will never touch. Lambda needed VM-grade isolation at container-grade speed and density, and nothing on the market did both.

## A virtual machine monitor with almost nothing in it

AWS's answer, described in a 2020 NSDI paper, was Firecracker: a new virtual machine monitor written in Rust, purpose-built to run "microVMs" instead of general-purpose virtual machines. Firecracker's design strategy was almost entirely subtractive. A conventional VMM like QEMU emulates a large surface of legacy PC hardware — BIOS, various disk controllers, sound cards, USB — because it has to support arbitrary guest operating systems and decades of software expecting that hardware to exist. Firecracker throws nearly all of that out. It implements a minimal device model exposing only what a cloud workload actually needs: a virtio network device, a virtio block device, a serial console, and a small handful of others, with no BIOS and no legacy emulation at all.

That minimalism is what makes both the security and performance numbers work. A smaller device model means a dramatically smaller attack surface — fewer emulated components translates directly into fewer places a guest could find a bug in the VMM and try to escape through it. It also means far less code has to be initialized before a guest can start running, which is most of why Firecracker's paper reports boot times on the order of a few hundred milliseconds and a memory overhead of roughly five megabytes per microVM — light enough to run thousands of them on a single host, densities that were simply out of reach for conventional VMs.

## KVM underneath, not a hypervisor from scratch

Firecracker doesn't reimplement virtualization itself — it runs on top of Linux's KVM, using the kernel's existing hardware virtualization support for CPU and memory isolation, and focuses its own code purely on the VMM layer: the minimal device model, the API for creating and configuring microVMs, and the guest lifecycle. That's a deliberate scoping decision — it let the Firecracker team build a small, auditable, memory-safe (thanks to Rust) VMM without also having to own and secure the much larger problem of hardware virtualization from scratch.

## From Lambda's internal need to an open-source project

Firecracker was built initially to solve Lambda's own isolation and density problem, and AWS later applied the same technology to AWS Fargate, giving both services a shared, hardware-enforced isolation boundary between customer workloads rather than relying on container-level isolation alone. AWS open-sourced Firecracker in 2018, and it has since been adopted well beyond AWS by other companies building multi-tenant sandboxed compute, since the underlying problem — strong isolation without full-VM overhead — is not unique to Lambda.

## What you can borrow

- When an existing tool does too much for your use case, consider whether a purpose-built, minimal reimplementation could beat it on both security and performance, not just one.
- A smaller emulated or exposed surface area is a security property in its own right — every component you don't implement is a component that can't be exploited.
- Build on a well-tested lower layer (Firecracker uses KVM) rather than reimplementing foundational, security-critical primitives yourself.
- Solve your own internal scaling problem first, generally; the resulting tool may turn out to be useful — and worth open-sourcing — well beyond its original purpose.
