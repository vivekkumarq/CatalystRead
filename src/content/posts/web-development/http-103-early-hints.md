---
title: "HTTP 103 Early Hints: Warming the Cache Before the Final Status"
slug: "http-103-early-hints"
description: "RFC 8297: 103 with Link preloads while the origin still computes 200, CDN support, and why a slow TTFB still benefits from hinted CSS."
publishedAt: "2026-09-19"
category: "Web Development"
tags:
  - Web Development
  - HTTP
  - Performance
  - CDN
sources:
  - title: "RFC 8297: An HTTP Status Code for Indicating Hints"
    author: "Kazuho Oku"
    publisher: "IETF"
    url: "https://www.rfc-editor.org/rfc/rfc8297"
  - title: "Early Hints"
    publisher: "web.dev / Chrome"
    url: "https://developer.chrome.com/docs/web-platform/early-hints"
---

A server often knows which CSS and JS the HTML will need **before** the template finishes. Waiting for `200` plus `<link rel=preload>` wastes the think-time. **HTTP 103 Early Hints** (RFC 8297) sends an informational response with `Link` headers (`rel=preload`, `rel=preconnect`) while the final response is still cooking. Supporting CDNs (Cloudflare, some Google stacks, etc.) can forward 103 to the browser so it starts fetching on an idle connection.

This replaces a trendy `llms.txt` content-discovery idea with a **real HTTP performance mechanism**.

## The sequence

```text
client GET /product/42
103 Early Hints
Link: </app.css>; rel=preload; as=style
(time passes, DB)
200 OK
content-type: text/html
...
```

The browser must not assume the final status. 103 is a hint. If the final page would not have used `app.css`, you wasted bandwidth. Hints should match what HTML will definitely need: the main stylesheet, a critical font, a preconnect to the image CDN.

HTTP/2 and HTTP/3 can push; Early Hints is **not** push. Push was poorly adopted. 103 is "please request these" using ordinary caching.

## Operational catches

Origin must be allowed to emit 103 before the body. Many app servers buffer; you need an explicit flush of headers (Node, nginx `http2_push` is different). CDNs may generate 103 from a cache of known assets for a URL pattern when origin is slow — that is the Cloudflare-style product. If origin is fast, 103 helps less.

Don't hint personalized URLs that leak. Don't hint 50 images. Measure LCP, not "we enabled Early Hints" as a checkbox.

## Support

Browsers and hops vary. A client that ignores 103 still works. That is the right degradation.

Read RFC 8297 (it is short) and your CDN's Early Hints doc. Then compare a slow-TTFB HTML document with and without 103 for the main CSS. If LCP does not move, the bottleneck was not the stylesheet, or 103 never left the edge. The status code is only useful if a hop in the middle understands it. Confirm with `chrome://net-export` or CDN logs, not with hope.
