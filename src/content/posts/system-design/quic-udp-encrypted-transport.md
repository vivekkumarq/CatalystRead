---
title: "QUIC: Encrypted Transport on UDP, and Why TCP's Handshake Became the Enemy"
slug: "quic-udp-encrypted-transport"
description: "Langley et al. and the IETF QUIC RFCs: TLS 1.3 in the handshake, streams over UDP, and the middlebox tax HTTP/2 never escaped."
publishedAt: "2026-08-21"
category: "System Design"
tags:
  - System Design
  - Networking
  - QUIC
  - HTTP/3
sources:
  - title: "The QUIC Transport Protocol: Design and Internet-Scale Deployment"
    author: "Adam Langley et al."
    publisher: "SIGCOMM 2017"
    url: "https://dl.acm.org/doi/10.1145/3098822.3098842"
  - title: "RFC 9000: QUIC: A UDP-Based Multiplexed and Secure Transport"
    publisher: "IETF"
    url: "https://www.rfc-editor.org/rfc/rfc9000"
---

TCP plus TLS plus HTTP/2 still pays for a handshake stack that middleboxes ossified and that head-of-line blocking at the TCP layer undid HTTP/2's stream multiplexing. QUIC (Langley and co-authors at Google, then IETF RFC 9000) moves multiplexed streams onto **UDP**, folds **TLS 1.3** into the transport handshake, and encrypts almost everything including sequence numbers in later versions, so the internet's "helpful" boxes cannot "optimize" the protocol to death.

## One RTT is the product requirement

A first connection does TLS 1.3 over QUIC: cryptographic parameters and transport parameters ride together. A returning client can use **0-RTT** application data, with the usual replay caveats TLS already documented. Connection migration — changing source IP when a phone switches from Wi-Fi to cellular — is possible because the connection is identified by a **connection ID**, not by the TCP 4-tuple alone.

```text
TCP:  SYN → SYN-ACK → ACK, then TLS, then HTTP
QUIC: ClientHello + transport params in UDP, server replies, app data sooner
```

Loss recovery is per-packet with QUIC's own ACK frames, not TCP SACK bolted on. Streams are independent at the application layer: a lost packet for stream 4 should not stall stream 7 the way TCP's single sequence space stalls HTTP/2. That is the head-of-line fix people actually wanted from HTTP/2.

## UDP is a political and operational choice

Many corporate networks rate-limit or block UDP except DNS. HTTP/3 therefore needs a fallback to HTTP/2/TLS/TCP. Tuning QUIC on the server means pacing, congestion control (often CUBIC or BBR), and buffering that used to live in the kernel TCP stack. User-space implementations (cronet, quiche, msquic, nginx) become part of your reliability story: a userspace bug is a transport incident.

The SIGCOMM 2017 paper reports Google's deployment numbers: reduced latency, especially on mobile, and the ability to iterate congestion control without waiting for kernel upgrades. That iteration speed is the hidden thesis. TCP congestion control lives in OS images. QUIC lives in the application or a library you ship.

## What to measure before you flip the flag

Handshake time, 0-RTT accept rate, UDP block rate from clients, CPU per GB (encryption plus userspace), and tail latency under loss. Packet coalescing and GSO/GRO offloads matter at load-balancer NICs. Connection ID-aware load balancing is required if you terminate QUIC behind L4 balancers that only hash 4-tuples — otherwise a migration or a CID change lands on the wrong machine.

QUIC is not "UDP is faster." UDP has no magic. QUIC is a transport that could evolve because it is encrypted and userspace. If your traffic is long-lived, in-DC, and already on well-tuned TCP, the win may be small. If your users are on lossy mobile networks and you still do three round trips before the first byte of HTML, the paper's motivation is your dashboard.

Read RFC 9000's invariants and the Google SIGCOMM deployment. Then look at whether your edge already speaks HTTP/3 and whether your health checks still assume TCP RST semantics that QUIC does not have.
