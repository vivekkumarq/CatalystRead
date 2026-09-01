---
title: "WebSockets vs. Server-Sent Events vs. WebTransport"
slug: "websockets-vs-sse-vs-webtransport"
description: "A practical comparison of WebSockets, Server-Sent Events, and WebTransport to help pick the right real-time transport for a given use case."
publishedAt: "2026-07-21"
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
