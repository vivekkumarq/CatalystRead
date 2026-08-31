---
title: "React Server Components, Explained Without the Hype"
slug: "react-server-components-explained"
description: "RSCs are not server-side rendering with a new name. They change where component code runs at all, and that changes what you can safely do in a component."
publishedAt: "2026-01-08"
category: "React"
tags:
  - React
  - React Server Components
  - Performance
  - Frontend Engineering
trending: true
---

Server-Side Rendering has always meant the same thing: run your component tree once on the server to produce HTML, then hydrate that HTML on the client into a fully interactive app — the component code itself still ships to and runs in the browser. React Server Components are a different axis entirely. An RSC's code never ships to the client at all. It runs exclusively on the server, on every request, and sends the client a serialized description of what to render — not JavaScript, not even HTML directly, but a special payload the client-side React runtime turns into UI.

## Two Kinds of Components, One Tree

Every component in an RSC-enabled app is either a Server Component (the default) or a Client Component (opted in with `'use client'`). They can nest inside each other, but the direction of composition only works one way cleanly: Server Components can render Client Components, but a Client Component cannot import and render a Server Component directly — it can only receive one as `children` or a prop, already rendered.

```jsx
// ProductPage.jsx — Server Component (no directive needed, this is the default)
import { db } from './db';
import AddToCartButton from './AddToCartButton';

export default async function ProductPage({ id }) {
  const product = await db.products.findById(id); // runs on the server, period
  return (
    <article>
      <h1>{product.name}</h1>
      <p>{product.description}</p>
      <AddToCartButton productId={product.id} price={product.price} />
    </article>
  );
}
```

```jsx
// AddToCartButton.jsx — Client Component
'use client';
import { useState } from 'react';

export default function AddToCartButton({ productId, price }) {
  const [pending, setPending] = useState(false);
  return (
    <button disabled={pending} onClick={() => setPending(true)}>
      Add to cart — ${price}
    </button>
  );
}
```

`ProductPage` can `await` a database call directly in its body — no `useEffect`, no loading state managed on the client, no API route to proxy the query. That database driver, and any secrets it needs, never enter the client bundle, because the component's code never crosses the network boundary at all.

## What This Actually Buys You

**Zero client-side bundle cost for server-only logic.** A Server Component that renders a markdown parser, a syntax highlighter, or a heavy formatting library adds nothing to the JavaScript the browser downloads — that code runs once, server-side, and only its output crosses the wire.

**Direct backend access without an API layer.** For a large class of apps, RSCs eliminate the need to hand-write a REST or GraphQL endpoint just to move data from a database to a component that immediately displays it.

**Automatic code-splitting at the Server/Client boundary.** Every `'use client'` boundary is a natural split point — the client bundle only contains the interactive leaves of the tree, not the data-fetching and layout logic wrapping them.

## The Constraints That Trip People Up

Server Components cannot use `useState`, `useEffect`, `useContext`, or any browser API — they don't run in a browser, so there's no state to hold between renders and no DOM to effect. The `'use client'` directive doesn't mean "this component runs on the client only" — it means "this component and everything it imports crosses the boundary into the client bundle," which is why it's usually placed as low in the tree as practical, not at the top of every interactive page.

Passing data from Server to Client Components has a real constraint too: props must be serializable. Functions, class instances, and Dates need explicit handling — you can't hand a Client Component a live database connection or a callback closure from the server.

## Where This Fits Today

RSCs are a framework-level feature — Next.js's App Router is the primary place most teams encounter them, though the RSC convention itself is part of React's own architecture, not Next-specific. Adopting RSCs is a routing and data-fetching decision as much as a component-authoring one, which is why the migration for existing apps tends to happen route by route rather than as a single rewrite. The mental shift that matters most: stop asking "should this be a hook," and start asking "does this code need to run in the browser at all."
