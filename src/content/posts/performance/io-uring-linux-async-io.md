---
title: "io_uring: Linux Async I/O Without a Thread per Operation"
slug: "io-uring-linux-async-io"
description: "Submission and completion rings, SQPOLL, and when io_uring beats epoll plus worker threads — plus the security history you should patch."
publishedAt: "2026-08-19"
category: "Performance"
tags:
  - Performance
  - Linux
  - I/O
  - Kernel
sources:
  - title: "Efficient IO with io_uring"
    author: "Jens Axboe"
    publisher: "kernel.dk"
    url: "https://kernel.dk/io_uring.pdf"
  - title: "io_uring man pages"
    publisher: "Linux"
    url: "https://man7.org/linux/man-pages/man7/io_uring.7.html"
---

`io_uring` (Axboe) is a pair of **shared memory rings** between user space and the kernel: you push submission queue entries (SQEs) for reads, writes, accepts, timeouts, and more; the kernel pushes completion queue entries (CQEs). One syscall (`io_uring_enter`) can harvest many completions. Compared with `epoll` plus a thread pool doing blocking `read`, you avoid thread handoff. Compared with POSIX AIO, the API actually works for files and sockets in one model.

## The rings

Map SQ and CQ. Fill an SQE with `opcode`, `fd`, buffer. Advance the tail. Completions include a result code. **Registered buffers and files** skip per-I/O bookkeeping. **SQPOLL** is a kernel thread that polls the SQ so you can submit without syscalls in the hottest path — at the cost of a pinned core and a bigger attack surface. Most servers should start without SQPOLL.

```text
user: SQE read fd 7 buf A → ring
kernel: DMA / filesystem → CQE res=4096
user: process CQE, recycle buffer
```

Buffer lifetime is yours. Completing into a buffer you already reused is memory corruption. Libraries (liburing) help. Languages without a mature wrapper should not reimplement the rings casually.

## When it wins

High IOPS small I/O, lots of sockets, NVMe. Node and Java will not magically use it until the runtime does (Netty, latest JDKs, and some HTTP servers have paths). A Spring app on Tomcat blocking JDBC will not get io_uring's benefits from a sysctl.

File I/O: buffered vs `O_DIRECT` still matters. io_uring is not a substitute for a missing index.

## Security and kernels

io_uring had a series of CVEs; some shops disable it (`sysctl` / seccomp). Production: current kernel, limited opcodes if you sandbox, no untrusted user access to the uring fd. Privilege: creating a ring is a capability story on some policies.

Read Axboe's PDF for the design and `man io_uring` for opcodes. Then measure `iouring` vs `epoll` on **your** syscall profile. If `read` is not in the profile, you needed a different optimization. If it is, and you control the runtime, the rings are the current Linux answer.
