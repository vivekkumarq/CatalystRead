---
title: "Rowhammer: When DRAM Integrity Is Not a Software Invariant"
slug: "rowhammer-hardware-fault-attacks"
description: "Kim et al. and the follow-on literature: adjacent-row bit flips, TRR's incomplete story, and why 'userspace cannot flip bits' stopped being true."
publishedAt: "2026-08-25"
category: "Security"
tags:
  - Security
  - Hardware
  - Memory Safety
  - Side Channels
sources:
  - title: "Flipping Bits in Memory Without Accessing Them: An Experimental Study of DRAM Disturbance Errors"
    author: "Yoongu Kim, Ross Daly, Jeremie Kim, Chris Fallin, Ji Hye Lee, Donghyuk Lee, Chris Wilkerson, Konrad Lai, Onur Mutlu"
    publisher: "ISCA 2014"
    url: "https://users.ece.cmu.edu/~yoonguk/papers/kim-isca14.pdf"
  - title: "TRRespass: Exploiting the Many Sides of Target Row Refresh"
    author: "Pietro Frigo et al."
    publisher: "IEEE S&P 2020"
    url: "https://comsec.ethz.ch/wp-content/files/trrespass_sp20.pdf"
---

DRAM stores bits as charge. Dense cells leak into neighbors when a row is opened over and over. Kim et al. (ISCA 2014) showed that **userspace hammering** of one row can flip bits in an adjacent row — **Rowhammer**. Integrity of memory is no longer only a compiler and MMU story. If an attacker can place a page of interest (page tables, cryptographic keys, Java object headers) next to a hammered aggressor, a flip can become privilege.

## The mechanics, without folklore

Memory controllers map physical addresses to banks, ranks, and rows in chip-specific ways. Hammering is not `memset`; it is a pattern that keeps a row's neighbors activated without letting them refresh cleanly. Double-sided hammering, many-sided patterns (TRRespass), and non-temporal stores to bypass caches all exist because caches would otherwise absorb the "accesses" before they become DRAM activations.

**Target Row Refresh (TRR)** was the vendor answer: detect hot rows and refresh neighbors. Frigo et al. and later work showed TRR on many devices was a finite-state heuristic, not a proof. New access patterns still produced flips on "mitigated" DIMMs. ECC reduces some flips to detectable errors and misses others (especially multi-bit). ECC is not a Rowhammer strategy by itself.

```text
aggressor row  A  A  A  A  A  (many activations)
victim row     bit unexpectedly 1→0 or 0→1
```

## Software's remaining levers

You cannot patch physics from a JAR. You can: keep firmware and microcode current; prefer platforms with documented refresh mitigations; use **memory isolation** so untrusted code does not share a bank neighborhood with page tables (hard in general-purpose clouds); avoid running mutually distrusting workloads on the same machine when the threat model includes physical-row attacks. Browsers restricted `clflush` and sharedArrayBuffer timing when JavaScript hammering was in the news; those were harm-reduction, not closure.

For high-assurance systems, treat DRAM as a probabilistic channel. Remote-cloud Rowhammer is harder than local but research keeps narrowing that. Do not write "we use Java, so memory is safe" in a threat model that includes bit flips in the JVM heap. Memory-safe languages still trust the hardware.

## What to do in a design review

If the attacker is remote HTTP only, prioritize boring bugs first. If the attacker can run native code on the same host (CI runners, multi-tenant IaaS, browsers with WASM), mention Rowhammer in the same breath as speculative execution: hardware faults that violate language-level isolation. Monitor corrected ECC if you have it; a spike is a signal.

Read Kim et al. for the original disturbance error measurements and TRRespass for why "the DIMM has TRR" is not the end of the ticket. Then keep your threat model honest about shared DRAM.
