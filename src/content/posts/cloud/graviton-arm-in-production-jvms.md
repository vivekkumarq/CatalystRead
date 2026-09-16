---
title: "Graviton in Production JVMs: ARM64 Is Not a Flag Day, It Is a GC and JNI Audit"
slug: "graviton-arm-in-production-jvms"
description: "AWS Graviton, multi-arch containers, AArch64 JDK builds, and the native libraries that fail first when you leave x86."
publishedAt: "2026-09-16"
category: "Cloud"
tags:
  - Cloud
  - AWS
  - Graviton
  - Java
sources:
  - title: "AWS Graviton"
    publisher: "Amazon Web Services"
    url: "https://aws.amazon.com/ec2/graviton/"
  - title: "Porting to linux-aarch64"
    publisher: "OpenJDK wiki"
    url: "https://wiki.openjdk.org/display/AArch64Port/Main"
---

Graviton instances sell more throughput per dollar for many server workloads. A JVM on `aarch64` is a first-class OpenJDK port, not an emulator. The migration dies on **JNI**: compression libs, crypto accelerators, brotli, protobuf native, old `libsigar`, and that one vendor `.so` from 2017. If your Docker image is `amd64` on an ARM node, you are paying qemu and you will not hit the price/performance slide.

## Multi-arch is the real project

Build `linux/amd64` and `linux/arm64` images in CI. Pin a JDK that publishes AArch64 (Temurin, Corretto, and friends). Test C2 compilation, GC (G1/ZGC on ARM), and **vector/crypto** intrinsics — some AES paths differ. JMH on x86 is not a Graviton result. Run the canary on `m7g` with production GC flags.

```text
FROM eclipse-temurin:21-jre-jammy
# image must be built for TARGETARCH, not copied from amd64
```

Netty native (epoll, tcnative/boringssl) must match arch. Alpine musl vs glibc surprises exist on ARM too. Java agents (coverage, APM) need ARM builds; an x86 agent will fail the container.

## Performance shape

More cores, often better watts. Single-thread turbo comparisons versus x86 SKUs vary by generation. Tail latency can improve or worsen depending on cache and NUMA (Graviton chips have their own topology). Disable `UseContainerCpuShares` folklore and set CPU requests honestly. Huge pages and transparent hugepages policies still matter.

JNI that falls back to pure Java is a silent tax. Look for `unsatisfied link` at boot, not in a sampling of happy logs. `os.arch` in a debug endpoint saves hours.

## Rollout

Canary a stateless service first. Databases and anything with C++ extensions next. Spot/Graviton mix in a cluster needs a node selector, not hope. Some ISV licenses are still x86-only.

Graviton is not "the JVM is slower on ARM." It is "your native surface is the risk." Budget a week for dependency archaeology, not an afternoon for an instance type change.

Read AWS's Graviton getting-started and your JDK vendor's AArch64 release notes. Then `file` every `.so` in the image. The first x86 ELF is the migration.
