---
title: "WebSockets vs. Server-Sent Events vs. WebTransport"
slug: "websockets-vs-sse-vs-webtransport"
description: "A practical comparison of WebSockets, Server-Sent Events, and WebTransport to help pick the right real-time transport for a given use case."
publishedAt: "2026-07-21"
updatedAt: "2026-09-16"
category: "Web Development"
tags:
  - Web Development
  - Real-Time
  - WebSockets
  - Networking
---

Reaching for WebSockets by default for anything "real-time" is common, but it's often the wrong tool — full-duplex connection management and reconnection logic are real complexity you don't need if your data only ever flows one direction. Picking between these three transports mostly comes down to one question: does the client need to send data continuously, or just receive it?

## Server-Sent Events: one-way, and simpler than people assume

SSE is plain HTTP kept open, streaming `text/event-stream` data server-to-client, with automatic reconnection built into the browser's `EventSource` API — no reconnection logic to write yourself.

```javascript
const events = new EventSource('/api/notifications');

events.addEventListener('message', (e) => {
  const data = JSON.parse(e.data);
  showNotification(data);
});

events.addEventListener('error', () => {
  // EventSource retries automatically; this fires per failed attempt
  console.warn('Connection lost, retrying...');
});
```

Server side, it's just a long-lived HTTP response with a specific content type:

```
Content-Type: text/event-stream

data: {"type": "order_shipped", "orderId": 4521}

data: {"type": "price_drop", "productId": 8832}

```

SSE runs over regular HTTP, so it works through existing proxies and load balancers without special configuration, and it degrades gracefully — it's just a fetch that keeps streaming. The real limitation is the browser's per-domain connection cap: over HTTP/1.1, six open EventSource connections to the same origin exhausts the browser's connection pool for that domain, though HTTP/2 removes this ceiling by multiplexing streams over one connection.

## WebSockets: full duplex, more to manage

When the client needs to send frequent messages too — a collaborative editor, a multiplayer game, a chat app — WebSockets are the natural fit, at the cost of connection lifecycle management you don't get for free:

```javascript
const socket = new WebSocket('wss://api.example.com/chat');

socket.addEventListener('open', () => socket.send(JSON.stringify({ type: 'join', room: 'general' })));
socket.addEventListener('message', (e) => renderMessage(JSON.parse(e.data)));
socket.addEventListener('close', () => scheduleReconnect()); // no automatic retry, unlike SSE
```

Unlike `EventSource`, a closed `WebSocket` does not reconnect on its own — you're responsible for detecting the close, implementing backoff, and re-establishing any server-side session state the reconnect needs to restore.

## WebTransport: built for unreliable, high-throughput streams

WebTransport runs over HTTP/3 and QUIC, and its standout feature is support for unreliable, unordered datagrams alongside reliable streams — something neither WebSockets nor SSE offer, since TCP underneath both enforces strict ordering.

```javascript
const transport = new WebTransport('https://example.com/webtransport');
await transport.ready;

const writer = transport.datagrams.writable.getWriter();
await writer.write(new Uint8Array([/* game state delta */]));
```

For something like real-time multiplayer position updates, losing an occasional packet and letting the next one supersede it is preferable to TCP's head-of-line blocking, where one dropped packet stalls every message queued behind it, even ones that arrived fine. This matters most on lossy networks — mobile connections switching towers, congested Wi-Fi — where TCP-based transports visibly stall in a way QUIC's independent streams don't.

## Picking one

Server-to-client only, and simplicity matters: SSE. Bidirectional and both sides send regularly, over infrastructure you're confident supports it: WebSockets — still the safer default given near-universal proxy and load balancer support. Bidirectional with tolerance for occasional loss and a need for genuinely low latency, on infrastructure that supports HTTP/3: WebTransport, though verify your CDN and proxy layer actually support it in production before betting critical infrastructure on it, since HTTP/3 support is still less universal than HTTP/2.

## A worked example

Stock ticks to 50k browsers: SSE from a fanout service, one-way, HTTP/2 friendly, automatic reconnect with `Last-Event-ID`. A collaborative editor: WebSocket with a message schema and heartbeat. A game with unreliable datagrams: WebTransport when the browser matrix allows, else WebSocket.

You load-test SSE vs WS on your proxy; some CDNs buffer SSE badly.

## Failure modes

WebSockets through a proxy that times out idle connections. SSE in HTTP/1.1 eating a browser connection slot. Using WS for a one-shot request. No backpressure: server sends faster than the client parses. Sticky sessions required but the load balancer is round-robin. WebTransport blocked on corporate networks.

JSON-per-message without a size cap.

## When this is the wrong tool

Polling every 30s is enough for a badge count. SSE cannot push binary easily or client-to-server. WebSockets are the wrong tool for request/response CRUD — use HTTP. WebTransport is the wrong default for a CRUD dashboard in 2026 if Safari support or intermediaries are unknown. Do not use any of them to replace a job queue between services; use a broker.

## A worked failure mode

A WebSocket is used for one-way server ticks; proxies buffer and kill idle connections; there is no heartbeat. SSE is used for a binary upload. WebTransport is chosen for a form that needed HTTP. The failure is the wrong channel. SSE for one-way text with auto-reconnect; WebSockets for duplex with pings; HTTP for request/response.

WebSockets are the wrong tool for a stock quote you can poll every 30s. WebTransport is overkill without a need. Match the primitive to direction and payload.

When this pattern is stretched past its assumptions, the first outage looks like a mysterious performance cliff instead of a design limit. "WebSockets vs. Server-Sent Events vs. WebTransport" fails that way when traffic mix, data shape, or team skill does not match the blog that sold the approach. Keep a kill switch: feature flag, smaller blast radius, or an older path that still works. Measure the thing the idea claims to improve, not a vanity graph. If you cannot name a workload where you would refuse to use it, you have not finished the design.
