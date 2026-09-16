---
title: "React Server Component Payloads: The Hidden Size of the RSC Flight Stream"
slug: "react-server-component-payload-size"
description: "What the Flight protocol ships, why a fat props object becomes a fat HTML-adjacent stream, and how to keep RSC responses small."
publishedAt: "2026-08-27"
category: "React"
tags:
  - React
  - RSC
  - Performance
  - Next.js
sources:
  - title: "React Server Components"
    publisher: "React docs"
    url: "https://react.dev/reference/rsc/server-components"
  - title: "RFC: First-class Support for Server Components"
    publisher: "React RFCs"
    url: "https://github.com/reactjs/rfcs/blob/main/text/0188-server-components.md"
---

Server Components render on the server and stream a **Flight** payload to the client: a compact encoding of the component tree, placeholders for Client Components, and **serialized props** that those client leaves need. People optimize JS bundles and ignore that the RSC response can be megabytes of duplicated JSON if you pass a whole ORM row into a client island.

## Props are the payload

A Client Component boundary (`'use client'`) is a serialization boundary. Everything you pass from a Server Component to it must be cloneable and is typically sent down. Pass `user` with 40 unused fields, nested author objects, and a 200 KB markdown string "in case the client needs it" — the stream includes them. Pass `userId` and let the client fetch, or pass the three fields the widget needs.

```jsx
// expensive: <Chart data={entireTimeseries} />
// cheaper:  <Chart src={`/api/series/${id}`} /> or a trimmed DTO
```

Children as JSX from the server can stay on the server if they are Server Components. The mistake is wrapping a huge server tree in a client provider that takes `value={big}`. Context from the client still needs a client parent.

## Streaming is not smallness

Streaming TTFB helps. It does not shrink total bytes. Compression (gzip/br) helps repeated keys; it will not save you from unique base64 blobs in props. Next.js App Router: look at the RSC payload in the network panel (`text/x-component` or similar), not only the document. Repeated layouts should not resend the world; when they do, you closed the client boundary too high.

Lists: sending 1000 rows to a client table "because RSC is free" is the new N+1. Paginate on the server. Don't send dates as strings in three formats.

## Secrets

Server-only modules must not be imported into client files. A leaked secret in the Flight stream is a security bug, not a perf bug. Treat the payload as visible to the user.

Read the RSC RFC's serialization constraints, then weigh one page's Flight size in the network tab. If it dwarfs the JS bundle, your island props are the bundle now. Cut DTOs like you would cut REST JSON — because that is what you shipped, with extra parentheses.
