---
title: "Response Compression: gzip, Brotli, and zstd Trade-offs"
slug: "response-compression-gzip-brotli-zstd-tradeoffs"
description: "A practical comparison of gzip, Brotli, and zstd for HTTP response compression, covering ratio, CPU cost, and where each one actually wins."
publishedAt: "2025-12-05"
category: "Performance"
tags:
  - Performance
  - Backend Engineering
  - Networking
---

Compression is one of the highest-leverage, lowest-risk performance changes available, and most teams enable it once and never revisit the choice. That's usually fine, but the gap between gzip, Brotli, and zstd is large enough that "just turn on gzip" leaves real bandwidth and latency on the table for high-traffic services.

## The three contenders

Gzip has been the default for two decades because every client supports it and it's cheap to compute. Its compression ratio is decent but not great, and at higher compression levels the CPU cost climbs faster than the ratio improves, so most deployments cap it around level 6.

Brotli, developed at Google, generally beats gzip on ratio by 15-25% for text content like HTML, CSS, and JSON, largely because it ships with a built-in static dictionary trained on common web content. The cost is compression time: at its highest quality levels Brotli is significantly slower than gzip, which is why it's often used with precompressed static assets rather than compressed on the fly for dynamic responses.

Zstd (Zstandard), from Meta, is the newer entrant and the one worth paying attention to. It achieves compression ratios competitive with Brotli at much higher speed, and its ratio-to-CPU curve is unusually favorable — you can push zstd to higher compression levels without the steep CPU cliff gzip hits. Browser support for zstd content-encoding has been catching up, though it's still behind gzip and Brotli in universal availability, so it needs a fallback.

## Static vs dynamic compression

For static assets — JS bundles, CSS, fonts — compress once at build time with the highest quality settings and serve the precompressed file. CPU cost is irrelevant here since it's paid once, not per request.

```nginx
# Serve precompressed files when available, fall back to on-the-fly gzip
location / {
    brotli_static on;
    gzip_static on;
    gzip on;
    gzip_comp_level 5;
    gzip_types text/plain text/css application/json application/javascript;
}
```

For dynamic responses — API JSON, server-rendered HTML — compression happens per request, so CPU cost is a real operational concern. This is where zstd's speed advantage matters most: it lets you compress dynamic responses at a higher ratio than gzip without adding meaningful latency or CPU load under traffic.

## Choosing per content type

Already-compressed formats — JPEG, PNG, video, most modern archive formats — gain nothing from another compression pass and just waste CPU cycles; skip compression for these content types entirely. Text-based formats are where compression pays off, often shrinking payloads by 70-90%.

## A practical default

Negotiate based on the client's `Accept-Encoding` header and serve the best available: Brotli or zstd for static precompressed assets, gzip as the universal fallback, and zstd for dynamic API responses if your CDN and clients support it. Set compression levels based on measured CPU headroom rather than defaults — a service already CPU-bound under load should stay conservative, while one with spare capacity can push higher ratios for meaningfully smaller payloads. Whatever you choose, validate the actual wire savings with real response payloads, not synthetic benchmarks; ratio gains on highly repetitive test data rarely match what you see on genuine, varied production JSON.
