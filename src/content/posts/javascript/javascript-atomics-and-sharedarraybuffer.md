---
title: "SharedArrayBuffer and Atomics: Shared Memory Without Inventing a Mutex Wrong"
slug: "javascript-atomics-and-sharedarraybuffer"
description: "When worker threads should share a buffer, how Atomics.wait and compareExchange actually work, and the security history that still gates SAB."
publishedAt: "2026-08-11"
updatedAt: "2026-09-16"
category: "JavaScript"
tags:
  - JavaScript
  - Concurrency
  - Web Workers
  - Performance
---

Most frontend work should stay on message passing: `postMessage`, structured clone, transferable `ArrayBuffer`. SharedArrayBuffer exists for the remaining cases — audio graphs, WASM heaps, codecs, lock-free ring buffers — where copying every frame is the bottleneck. It is also how you accidentally invent data races in a language that spent years pretending threads were not its problem.

## Isolation first, then the headers

Browsers require a cross-origin isolated context (`Cross-Origin-Opener-Policy: same-origin` and `Cross-Origin-Embedder-Policy: require-corp`, or a documented equivalent) before SAB is available. That requirement is not bureaucracy; it is leftover from Spectre-class attacks where high-resolution shared memory was a timer. If `typeof SharedArrayBuffer === "undefined"` in production, check isolation before rewriting the algorithm.

Workers still do not share JavaScript objects. They share a block of bytes. You pick a layout: a 4-byte sequence number, a 4-byte lock word, then payload. Document that layout once. The next engineer will not guess it from `Int32Array` indexes.

## Atomics are the only safe operators

Plain `i32[0]++` from two workers is a race. `Atomics.add`, `compareExchange`, `load`, and `store` are the operations the memory model defines. `Atomics.wait` / `notify` (and `waitAsync` on the main thread) are how you block a worker until a producer flips a flag without a busy loop that melts a laptop.

```javascript
// producer
Atomics.store(i32, 0, 1);
Atomics.notify(i32, 0, 1);

// consumer worker
Atomics.wait(i32, 0, 0); // park until not 0
const ready = Atomics.load(i32, 0);
```

`wait` on the main thread is forbidden for good reason — it would freeze the page. Use `waitAsync` or keep waiting on a worker.

## A mutex you can actually review

A compare-exchange spinlock is a teaching toy. In the browser it can livelock with a tab in the background. Prefer a wait/notify lock, or better: a single-producer single-consumer ring buffer with atomic head/tail and no lock at all. If you need a general mutex, ask whether the work should have been a job queue with ownership transfer instead of shared mutation.

WASM threads (pthreads) sit on this same primitive. If your build enables threads, you inherited SAB requirements and a data-race story in C++ as well as JS. Treat the linear memory as hostile shared state: no JS object graphs, no assuming `Date.now` is a fence.

Use shared memory when profiling said copies were the tax. Use messages when a race would be worse than a copy. That split will keep you out of the comments on a three-year-old GitHub issue titled "random NaNs in the audio thread."

## A worked SPSC ring

Producer worker writes samples into a `Float32Array` view on SAB. Head and tail are `Int32` indexes updated with `Atomics`. Producer advances tail after the payload is written; consumer waits with `Atomics.wait` on a seq word, then `load`s tail, copies a chunk out, advances head, `notify`s the producer if the buffer was full. No mutex. Two producers on the same ring is undefined — that is the “single” in SPSC.

Document byte offsets in one comment block. Tests should run two workers in Node (`worker_threads`) with a deterministic fill pattern and assert no torn reads (a sequence number next to the payload, or wrap the payload in a checksum for the test).

## Failure modes

**Non-atomic `++` on indexes.** Classic lost updates; buffer overruns.

**`wait` on the main thread.** Throws or is forbidden; freeze risk.

**Missing COOP/COEP.** SAB is undefined; you “fix” it by polyfilling with copies and lose the point.

**Endianness and WASM.** Mixed views without a documented endian story.

**Background tab throttling.** Spinlocks livelock; wait/notify still needs a timeout story so a dead producer does not park a worker forever.

## When not to use SAB

UI state, Redux stores, DOM nodes — message passing. Anything where a race is a security or money bug and you have not written a memory-model review. If copies of 128-byte messages are not in the profile, skip shared memory. If you cannot set isolation headers because of third-party iframes, you do not have SAB in the browser; use workers + transferables.

## Review checklist

- Isolation headers verified in production, not only localhost.
- Only Atomics on shared indexes; layout documented.
- No main-thread `wait`; prefer SPSC over a homemade mutex.
- Profiled copies-before-SAB; teardown unparks waiters on worker exit.
