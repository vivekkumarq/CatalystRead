---
title: "HTTP/2 and HTTP/3: What Multiplexing Actually Changes for Real Apps"
slug: "http-2-and-http-3-what-multiplexing-changes"
description: "A practical look at how HTTP/2 and HTTP/3 multiplexing affect application design, when it helps, and where old HTTP/1.1 habits still hurt you."
publishedAt: "2025-09-22"
category: "Performance"
tags:
  - Performance
  - Networking
  - Backend Engineering
  - Web Development
---

HTTP/1.1 forced browsers into a workaround culture: domain sharding, spriting, bundling everything into one giant JS file, inlining small images as data URIs. All of that existed to dodge the six-connections-per-host limit and the fact that each connection could only have one request in flight at a time. HTTP/2 removed the reason for most of those tricks, and HTTP/3 removed a different bottleneck underneath it. Understanding what actually changed matters because a lot of teams still ship HTTP/1.1-era workarounds on HTTP/2 infrastructure, which can make things worse, not better.

## What multiplexing solves

HTTP/2 introduced binary framing and multiple concurrent streams over a single TCP connection. Instead of six parallel connections each serializing requests, you get one connection carrying dozens of interleaved request/response streams. The head-of-line blocking that made HTTP/1.1 pipelining useless in practice is gone at the HTTP layer.

This changes the calculus on bundling. Concatenating every JS module into one file made sense when each additional file cost a full connection round trip. Under HTTP/2, many small, cacheable files can outperform one large bundle: a single-line change no longer invalidates the whole bundle's cache entry, and the browser can request only what changed. Domain sharding actively hurts under HTTP/2 — splitting resources across `img1.example.com`, `img2.example.com` just forces multiple TLS handshakes and connections instead of reusing one multiplexed connection.

## Where HTTP/2 still blocks

HTTP/2 solved head-of-line blocking at the HTTP layer but not at the transport layer. It still runs over TCP, and TCP guarantees in-order delivery of bytes on a connection. If one packet is lost, every stream sharing that connection stalls until the retransmission arrives, even if the lost packet only belonged to one of them. On a lossy network — mobile, satellite, congested wifi — this shows up as an entire page hanging over a single dropped packet.

## What HTTP/3 changes underneath

HTTP/3 replaces TCP with QUIC, which runs over UDP and implements its own reliability and multiplexing at the transport level. Because QUIC tracks stream state independently, a lost packet only blocks the stream it belonged to — other streams keep flowing. QUIC also folds the TLS handshake into its own connection setup, so a fresh connection to a server you've talked to before can often send data on the very first round trip (0-RTT), compared to TCP+TLS's typical two round trips before any application data moves.

```
TCP + TLS 1.3:  SYN/SYN-ACK → TLS handshake → HTTP request
QUIC (0-RTT):   Combined handshake + HTTP request in one round trip
```

The other underrated win is connection migration. QUIC connections are identified by a connection ID, not a source IP/port tuple, so a client switching from wifi to cellular can keep the same connection alive instead of renegotiating from scratch — a real difference for mobile apps.

## Practical implications

Serve resources over a single origin where possible, stop sharding domains, and let HTTP/2 or HTTP/3 multiplexing do the parallelization. Still bundle where it reduces redundant boilerplate, but favor multiple reasonably sized chunks over one monolith so caching stays granular. Prioritize enabling HTTP/3 for mobile-heavy or geographically distributed audiences, where packet loss and network switching are common — the gains are much smaller for stable, low-latency wired connections. And measure with real client data, not synthetic lab tests, since multiplexing benefits are highly dependent on network conditions you can't fully replicate on a fast office connection.
